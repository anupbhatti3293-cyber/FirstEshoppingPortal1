import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/adminAuth';
import { callClaude, parseClaudeJson } from '@/lib/anthropic';
import {
  OptimiseRequestSchema,
  TitleOutputSchema,
  DescriptionOutputSchema,
  SeoOutputSchema,
  QualityOutputSchema,
  type TitleOutput,
  type DescriptionOutput,
  type SeoOutput,
  type QualityOutput,
} from '@/lib/stylemateSchemas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 1;
const PROMPT_VERSION = 'v1.0';

function badgeFromScore(score: number): string {
  if (score >= 85) return 'Engineer Tested';
  if (score >= 70) return 'QA Approved';
  if (score >= 50) return 'Verified';
  return '';
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = OptimiseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { productId } = parsed.data;

  // Fetch product from DB
  const { data: product, error: productError } = await supabase
    .from('products')
    .select(`
      id, name, description, short_description, category,
      base_price_usd, base_price_gbp, tags,
      rating_average, rating_count, stock_quantity,
      product_images(url, alt_text)
    `)
    .eq('id', productId)
    .eq('tenant_id', TENANT_ID)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const imageCount = Array.isArray(product.product_images)
    ? product.product_images.length
    : 0;

  // ── F1: Title Rewriter ─────────────────────────────────────────
  const titleSystem = `You are a conversion copywriter for LuxeHaven, a premium US/UK dropshipping store.
Brand voice: luxurious, trustworthy, aspirational.
Return ONLY valid JSON matching this shape:
{ "us": "<title max 70 chars>", "uk": "<title max 70 chars>" }
Rules:
- Emotional hook + key feature + trust signal format
- No supplier names, model numbers, or Chinese-style keyword stuffing
- UK title should feel natural to British buyers
- US title should feel natural to American buyers
- No markdown, no extra keys`;

  const titleUser = `Product name: ${product.name}
Category: ${product.category}
Original description: ${product.description ?? 'Not provided'}
Price: $${product.base_price_usd} USD / £${product.base_price_gbp} GBP

Rewrite the product title for US and UK markets.`;

  // ── F2: Description Generator ──────────────────────────────────
  const descSystem = `You are a conversion copywriter for LuxeHaven, a premium US/UK dropshipping store.
Brand voice: luxurious, trustworthy, aspirational.
Return ONLY valid JSON matching this shape:
{
  "us": { "full": "<300-500 word description>", "short": "<under 100 words>" },
  "uk": { "full": "<300-500 word description>", "short": "<under 100 words>" }
}
Structure for full description: Hook → Problem solved → 3-5 key benefits → Social proof angle → CTA
US: lifestyle-forward, American English, inches/miles/Fahrenheit
UK: quality/value focus, British English (colour, favourite, organise), no unverifiable health claims
No markdown, no extra keys`;

  const descUser = `Product: ${product.name}
Category: ${product.category}
Price: $${product.base_price_usd} USD / £${product.base_price_gbp} GBP
Rating: ${product.rating_average}/5 from ${product.rating_count} reviews
Original description: ${product.description ?? 'Not provided'}

Generate US and UK product descriptions.`;

  // ── F3: SEO Metadata ───────────────────────────────────────────
  const seoSystem = `You are an SEO specialist for LuxeHaven, a premium US/UK dropshipping store.
Return ONLY valid JSON matching this shape:
{
  "us": {
    "metaTitle": "<max 60 chars>",
    "metaDescription": "<max 160 chars>",
    "tags": ["tag1","tag2","tag3","tag4","tag5"],
    "faq": [{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}]
  },
  "uk": {
    "metaTitle": "<max 60 chars>",
    "metaDescription": "<max 160 chars>",
    "tags": ["tag1","tag2","tag3","tag4","tag5"],
    "faq": [{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}]
  }
}
FAQ questions must match real customer search queries. Tags: 5-10, no duplicates.
No markdown, no extra keys`;

  const seoUser = `Product: ${product.name}
Category: ${product.category}
Existing tags: ${(product.tags ?? []).join(', ')}
Description snippet: ${(product.description ?? '').slice(0, 300)}

Generate US and UK SEO metadata with 5 FAQ questions each.`;

  // ── F4: Quality Score ──────────────────────────────────────────
  const qualitySystem = `You are a product quality analyst for LuxeHaven dropshipping store.
Return ONLY valid JSON matching this shape:
{
  "score": <0-100 integer>,
  "breakdown": {
    "descriptionQuality": <0-25>,
    "imageQuality": <0-20>,
    "supplierReliability": <0-20>,
    "reviewSentiment": <0-20>,
    "marketDemand": <0-15>
  },
  "badge": "none" | "verified" | "qa_approved" | "engineer_tested",
  "notes": "<optional brief notes for admin>"
}
Badge thresholds: 0-49=none, 50-69=verified, 70-84=qa_approved, 85-100=engineer_tested
No markdown, no extra keys`;

  const qualityUser = `Product: ${product.name}
Category: ${product.category}
Description length: ${(product.description ?? '').length} characters
Image count: ${imageCount}
Rating: ${product.rating_average}/5 from ${product.rating_count} reviews
Stock: ${product.stock_quantity} units
Price: $${product.base_price_usd} USD

Generate quality score and QA badge.`;

  try {
    // Run all 4 Claude calls in parallel for speed
    const [titleRaw, descRaw, seoRaw, qualityRaw] = await Promise.all([
      callClaude(titleSystem, titleUser, 400),
      callClaude(descSystem, descUser, 1500),
      callClaude(seoSystem, seoUser, 1200),
      callClaude(qualitySystem, qualityUser, 600),
    ]);

    // Parse + validate with Zod
    const titleData = TitleOutputSchema.parse(parseClaudeJson<TitleOutput>(titleRaw));
    const descData = DescriptionOutputSchema.parse(parseClaudeJson<DescriptionOutput>(descRaw));
    const seoData = SeoOutputSchema.parse(parseClaudeJson<SeoOutput>(seoRaw));
    const qualityData = QualityOutputSchema.parse(parseClaudeJson<QualityOutput>(qualityRaw));

    // Upsert into ai_product_analysis
    const { error: upsertError } = await supabase
      .from('ai_product_analysis')
      .upsert(
        {
          tenant_id: TENANT_ID,
          product_id: productId,
          ai_model: 'claude-sonnet-4-6',
          prompt_version: PROMPT_VERSION,
          stylemate_status: 'completed',

          // Titles
          ai_title_us: titleData.us,
          ai_title_uk: titleData.uk,

          // Descriptions
          ai_description_us: descData.us.full,
          ai_description_uk: descData.uk.full,
          ai_short_desc_us: descData.us.short,
          ai_short_desc_uk: descData.uk.short,

          // SEO
          ai_seo_title_us: seoData.us.metaTitle,
          ai_seo_title_uk: seoData.uk.metaTitle,
          ai_seo_desc_us: seoData.us.metaDescription,
          ai_seo_desc_uk: seoData.uk.metaDescription,
          ai_tags_us: seoData.us.tags,
          ai_tags_uk: seoData.uk.tags,
          ai_faq_us: seoData.us.faq,
          ai_faq_uk: seoData.uk.faq,

          // Quality
          quality_score: qualityData.score,
          description_quality_score: qualityData.breakdown.descriptionQuality,
          image_quality_score: qualityData.breakdown.imageQuality,
          review_sentiment_score: qualityData.breakdown.reviewSentiment,
        },
        { onConflict: 'tenant_id,product_id' }
      );

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to save AI results' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      productId,
      result: {
        title: titleData,
        description: descData,
        seo: seoData,
        quality: qualityData,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('StyleMate AI error:', message);

    // Mark as failed in DB
    await supabase
      .from('ai_product_analysis')
      .upsert(
        {
          tenant_id: TENANT_ID,
          product_id: productId,
          ai_model: 'claude-sonnet-4-6',
          prompt_version: PROMPT_VERSION,
          stylemate_status: 'failed',
        },
        { onConflict: 'tenant_id,product_id' }
      );

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
