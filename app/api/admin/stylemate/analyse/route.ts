/**
 * POST /api/admin/stylemate/analyse
 * Runs StyleMate AI (F1 Title + F2 Description + F3 SEO) on a single product.
 * Returns the AI-generated content for admin preview before publish.
 */
import { NextRequest, NextResponse }                   from 'next/server';
import { requireAdminRole }                            from '@/lib/adminAuth';
import { createClient }                                from '@supabase/supabase-js';
import { callClaude, PROMPT_VERSION }                  from '@/lib/anthropic';
import { OptimiseRequestSchema, TitleOutputSchema,
          DescriptionOutputSchema, SeoOutputSchema,
          QualityOutputSchema }                        from '@/lib/stylemateSchemas';
import type { TitleOutput, DescriptionOutput,
               SeoOutput, QualityOutput }              from '@/lib/stylemateSchemas';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 1;

const BRAND_VOICE = `You are a luxury dropshipping copywriter for LuxeHaven — a premium UK and US e-commerce brand.
Brand voice: aspirational, trustworthy, elegant, and conversion-focused.
NEVER mention supplier names, model numbers, or Chinese-style keyword stuffing.
NEVER make unverifiable medical or health claims.
Always respond with valid JSON only — no markdown, no preamble, no explanation.`;

export async function POST(req: NextRequest) {
  const auth = await requireAdminRole(req);
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Parse + validate request
  let parsed;
  try {
    const body = await req.json();
    parsed = OptimiseRequestSchema.parse(body);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request', details: String(err) }, { status: 400 });
  }

  const { productId, market } = parsed;

  // Fetch product + images + reviews
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select(`
      id, name, description, short_description, category,
      base_price_usd, base_price_gbp, tags, rating_average, rating_count,
      stock_quantity, meta_title, meta_description,
      product_images ( url, alt_text, position ),
      product_reviews ( rating, title, content, is_approved )
    `)
    .eq('id', productId)
    .eq('tenant_id', TENANT_ID)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Check for existing analysis row
  const { data: existingAnalysis } = await supabaseAdmin
    .from('ai_product_analysis')
    .select('id')
    .eq('product_id', productId)
    .eq('tenant_id', TENANT_ID)
    .single();

  // Mark as processing
  const { data: analysisRow, error: upsertError } = await supabaseAdmin
    .from('ai_product_analysis')
    .upsert(
      {
        ...(existingAnalysis ? { id: existingAnalysis.id } : {}),
        tenant_id:       TENANT_ID,
        product_id:      productId,
        ai_model:        'claude-sonnet-4-6',
        prompt_version:  PROMPT_VERSION,
        stylemate_status: 'processing',
      },
      { onConflict: 'id' }
    )
    .select('id')
    .single();

  if (upsertError || !analysisRow) {
    return NextResponse.json({ error: 'Failed to initialise analysis row' }, { status: 500 });
  }

  const analysisId = analysisRow.id;

  try {
    // Build product context string
    const reviewSummary = (product.product_reviews as Array<{rating:number;title:string;content:string;is_approved:boolean}>)
      .filter(r => r.is_approved)
      .slice(0, 10)
      .map(r => `${r.rating}/5 — ${r.title}: ${r.content}`)
      .join('\n');

    const imageCount = (product.product_images as Array<{url:string}>).length;

    const productContext = `
Product Name: ${product.name}
Category: ${product.category}
Current Description: ${product.description ?? 'None'}
Price USD: $${product.base_price_usd} | Price GBP: £${product.base_price_gbp}
Rating: ${product.rating_average}/5 (${product.rating_count} reviews)
Images available: ${imageCount}
Stock: ${product.stock_quantity} units
Existing tags: ${(product.tags as string[]).join(', ')}

Customer Reviews (approved):
${reviewSummary || 'No reviews yet'}`;

    // ── F1: Title Rewriter ─────────────────────────────────────────────────
    const titleResult = await callClaude<TitleOutput>(
      [{
        role:    'user',
        content: `Rewrite the product title for US and UK markets.

${productContext}

Rules:
- US title: lifestyle-forward, aspirational, under 70 chars
- UK title: quality-focused, under 70 chars, British English
- Format: emotional hook + key feature + trust signal
- No model numbers, no supplier names, no keyword stuffing

Respond with ONLY this JSON:
{"title_us": "...", "title_uk": "..."}`,
      }],
      { system: BRAND_VOICE, maxTokens: 400 }
    );
    TitleOutputSchema.parse(titleResult);

    // ── F2: Description Generator ──────────────────────────────────────────
    const descResult = await callClaude<DescriptionOutput>(
      [{
        role:    'user',
        content: `Write full product descriptions (300-500 words) and short descriptions (under 100 words) for US and UK markets.

${productContext}

Structure for each:
1. Hook sentence (problem/desire)
2. What it is and why it's special
3. 3-5 key benefits as flowing prose (not bullet points)
4. Social proof angle based on reviews
5. Call to action

UK version: British English spellings (colour, favourite, organise), reference UK lifestyle context, mention GBP pricing.
US version: American English, lifestyle-forward, mention USD pricing.

Respond with ONLY this JSON:
{
  "description_us": "...",
  "description_uk": "...",
  "short_description_us": "...",
  "short_description_uk": "..."
}`,
      }],
      { system: BRAND_VOICE, maxTokens: 1500 }
    );
    DescriptionOutputSchema.parse(descResult);

    // ── F3: SEO Metadata Generator ─────────────────────────────────────────
    const seoResult = await callClaude<SeoOutput>(
      [{
        role:    'user',
        content: `Generate SEO metadata and FAQ for US and UK markets.

${productContext}

Requirements:
- seo_title: under 60 chars, include primary keyword
- seo_desc: under 160 chars, include CTA
- tags: 5-10 high-intent, low-competition search terms per market
- faq: exactly 5 Q&As per market that match real customer search patterns
- UK: focus on British search behaviour, include "UK" where relevant
- US: focus on American search behaviour

Respond with ONLY this JSON:
{
  "seo_title_us": "...",
  "seo_title_uk": "...",
  "seo_desc_us": "...",
  "seo_desc_uk": "...",
  "tags_us": [...],
  "tags_uk": [...],
  "faq_us": [{"q": "...", "a": "..."}],
  "faq_uk": [{"q": "...", "a": "..."}]
}`,
      }],
      { system: BRAND_VOICE, maxTokens: 1500 }
    );
    SeoOutputSchema.parse(seoResult);

    // ── F4: Quality Score ──────────────────────────────────────────────────
    const qualityResult = await callClaude<QualityOutput>(
      [{
        role:    'user',
        content: `Score this product's quality from 0-100 for dropshipping suitability.

${productContext}

Scoring breakdown (must sum to quality_score):
- description_quality: 0-25 (how detailed and trustworthy is the current description?)
- image_quality: 0-20 (number of images: 0=0pts, 1=10pts, 2=15pts, 3+=20pts)
- supplier_reliability: 0-20 (based on rating and review count)
- review_sentiment: 0-20 (based on review content and rating)
- market_demand: 0-15 (category popularity for UK/US dropshipping)

QA badge rules:
- 0-49: "none"
- 50-69: "verified"
- 70-84: "qa_approved"
- 85-100: "engineer_tested"

Respond with ONLY this JSON:
{
  "quality_score": 0-100,
  "description_quality": 0-25,
  "image_quality": 0-20,
  "supplier_reliability": 0-20,
  "review_sentiment": 0-20,
  "market_demand": 0-15,
  "qa_badge": "none|verified|qa_approved|engineer_tested",
  "improvement_suggestions": ["...", "..."]
}`,
      }],
      { system: BRAND_VOICE, maxTokens: 600 }
    );
    QualityOutputSchema.parse(qualityResult);

    // ── Save all results to ai_product_analysis ────────────────────────────
    const updatePayload: Record<string, unknown> = {
      ai_title:             titleResult.title_us,
      ai_title_us:          titleResult.title_us,
      ai_title_uk:          titleResult.title_uk,
      ai_description:       descResult.description_us,
      ai_description_us:    descResult.description_us,
      ai_description_uk:    descResult.description_uk,
      ai_short_description: descResult.short_description_us,
      ai_short_desc_us:     descResult.short_description_us,
      ai_short_desc_uk:     descResult.short_description_uk,
      ai_seo_title:         seoResult.seo_title_us,
      ai_seo_title_us:      seoResult.seo_title_us,
      ai_seo_title_uk:      seoResult.seo_title_uk,
      ai_seo_description:   seoResult.seo_desc_us,
      ai_seo_desc_us:       seoResult.seo_desc_us,
      ai_seo_desc_uk:       seoResult.seo_desc_uk,
      ai_tags:              seoResult.tags_us,
      ai_tags_us:           seoResult.tags_us,
      ai_tags_uk:           seoResult.tags_uk,
      ai_faq_us:            seoResult.faq_us,
      ai_faq_uk:            seoResult.faq_uk,
      quality_score:        qualityResult.quality_score,
      image_quality_score:  qualityResult.image_quality,
      description_quality_score: qualityResult.description_quality,
      review_sentiment_score:    qualityResult.review_sentiment,
      qa_badge_label:       qualityResult.qa_badge,
      stylemate_status:     qualityResult.quality_score < 50 ? 'needs_review' : 'completed',
      raw_ai_response: {
        title:   titleResult,
        desc:    descResult,
        seo:     seoResult,
        quality: qualityResult,
      },
    };

    await supabaseAdmin
      .from('ai_product_analysis')
      .update(updatePayload)
      .eq('id', analysisId);

    // Also update products table quality fields immediately
    await supabaseAdmin
      .from('products')
      .update({
        quality_score:       qualityResult.quality_score,
        qa_badge:            qualityResult.qa_badge,
        last_ai_updated_at:  new Date().toISOString(),
      })
      .eq('id', productId)
      .eq('tenant_id', TENANT_ID);

    // Log success
    await supabaseAdmin.from('automation_logs').insert({
      tenant_id: TENANT_ID,
      level:     'INFO',
      action:    'STYLEMATE_ANALYSE',
      entity:    'product',
      entity_id: String(productId),
      message:   `StyleMate AI completed for product ${productId}. Quality score: ${qualityResult.quality_score}`,
      metadata:  { analysisId, market, promptVersion: PROMPT_VERSION },
    });

    return NextResponse.json({
      success:    true,
      analysisId,
      productId,
      title:      titleResult,
      description: descResult,
      seo:        seoResult,
      quality:    qualityResult,
      status:     updatePayload.stylemate_status,
    });

  } catch (err) {
    // Mark as failed + log
    await supabaseAdmin
      .from('ai_product_analysis')
      .update({ stylemate_status: 'failed' })
      .eq('id', analysisId);

    await supabaseAdmin.from('automation_logs').insert({
      tenant_id: TENANT_ID,
      level:     'ERROR',
      action:    'STYLEMATE_ANALYSE',
      entity:    'product',
      entity_id: String(productId),
      message:   `StyleMate AI failed for product ${productId}: ${String(err)}`,
      metadata:  { analysisId, promptVersion: PROMPT_VERSION },
    });

    console.error('[StyleMate] analyse error:', err);
    return NextResponse.json(
      { error: 'AI analysis failed', details: String(err) },
      { status: 500 }
    );
  }
}
