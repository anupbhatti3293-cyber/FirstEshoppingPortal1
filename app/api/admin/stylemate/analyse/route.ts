import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/adminAuth';
import { callAI, parseAIJson, getProviderName, type AIProvider } from '@/lib/aiProvider';
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

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.success) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const parsed = OptimiseRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { productId } = parsed.data;

  // Allow per-request provider override from admin UI
  const providerOverride = (body as Record<string, unknown>)?.provider as AIProvider | undefined;

  const { data: product, error: productError } = await supabase
    .from('products')
    .select(`id, name, description, short_description, category,
      base_price_usd, base_price_gbp, tags, rating_average, rating_count, stock_quantity,
      product_images(url, alt_text)`)
    .eq('id', productId)
    .eq('tenant_id', TENANT_ID)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const imageCount = Array.isArray(product.product_images) ? product.product_images.length : 0;
  const activeModel = getProviderName(providerOverride);

  // ── Prompts ───────────────────────────────────────────────────
  const titleSystem = `You are a conversion copywriter for LuxeHaven, a premium US/UK dropshipping store.
Brand voice: luxurious, trustworthy, aspirational.
Return ONLY valid JSON: { "us": "<title max 70 chars>", "uk": "<title max 70 chars>" }
Rules: Emotional hook + key feature + trust signal. No supplier names, no keyword stuffing. No markdown.`;

  const descSystem = `You are a conversion copywriter for LuxeHaven, a premium US/UK dropshipping store.
Return ONLY valid JSON:
{ "us": { "full": "<300-500 words>", "short": "<under 100 words>" }, "uk": { "full": "<300-500 words>", "short": "<under 100 words>" } }
Structure: Hook → Problem solved → 3-5 benefits → Social proof → CTA.
US: American English, lifestyle-forward. UK: British English (colour/favourite/organise), quality-focused. No markdown.`;

  const seoSystem = `You are an SEO specialist for LuxeHaven, a premium US/UK dropshipping store.
Return ONLY valid JSON:
{ "us": { "metaTitle": "<60 chars>", "metaDescription": "<160 chars>", "tags": [5-10 strings], "faq": [{"q":"...","a":"..."}x5] },
  "uk": { "metaTitle": "<60 chars>", "metaDescription": "<160 chars>", "tags": [5-10 strings], "faq": [{"q":"...","a":"..."}x5] } }
No markdown.`;

  const qualitySystem = `You are a product quality analyst for LuxeHaven.
Return ONLY valid JSON:
{ "score": <0-100>, "breakdown": { "descriptionQuality": <0-25>, "imageQuality": <0-20>, "supplierReliability": <0-20>, "reviewSentiment": <0-20>, "marketDemand": <0-15> }, "badge": "none"|"verified"|"qa_approved"|"engineer_tested", "notes": "<optional>" }
Badge: 0-49=none, 50-69=verified, 70-84=qa_approved, 85-100=engineer_tested. No markdown.`;

  const base = `Product: ${product.name}\nCategory: ${product.category}\nPrice: $${product.base_price_usd} USD / \u00a3${product.base_price_gbp} GBP\nRating: ${product.rating_average}/5 from ${product.rating_count} reviews\nDescription: ${product.description ?? 'Not provided'}`;

  try {
    const [titleRaw, descRaw, seoRaw, qualityRaw] = await Promise.all([
      callAI(titleSystem, base, 400, providerOverride),
      callAI(descSystem, base, 1500, providerOverride),
      callAI(seoSystem, `${base}\nExisting tags: ${(product.tags ?? []).join(', ')}`, 1200, providerOverride),
      callAI(qualitySystem, `${base}\nImage count: ${imageCount}\nStock: ${product.stock_quantity}`, 600, providerOverride),
    ]);

    const titleData = TitleOutputSchema.parse(parseAIJson<TitleOutput>(titleRaw));
    const descData  = DescriptionOutputSchema.parse(parseAIJson<DescriptionOutput>(descRaw));
    const seoData   = SeoOutputSchema.parse(parseAIJson<SeoOutput>(seoRaw));
    const qualityData = QualityOutputSchema.parse(parseAIJson<QualityOutput>(qualityRaw));

    const { error: upsertError } = await supabase
      .from('ai_product_analysis')
      .upsert({
        tenant_id: TENANT_ID,
        product_id: productId,
        ai_model: activeModel,
        prompt_version: PROMPT_VERSION,
        stylemate_status: 'completed',
        ai_title_us: titleData.us,
        ai_title_uk: titleData.uk,
        ai_description_us: descData.us.full,
        ai_description_uk: descData.uk.full,
        ai_short_desc_us: descData.us.short,
        ai_short_desc_uk: descData.uk.short,
        ai_seo_title_us: seoData.us.metaTitle,
        ai_seo_title_uk: seoData.uk.metaTitle,
        ai_seo_desc_us: seoData.us.metaDescription,
        ai_seo_desc_uk: seoData.uk.metaDescription,
        ai_tags_us: seoData.us.tags,
        ai_tags_uk: seoData.uk.tags,
        ai_faq_us: seoData.us.faq,
        ai_faq_uk: seoData.uk.faq,
        quality_score: qualityData.score,
        description_quality_score: qualityData.breakdown.descriptionQuality,
        image_quality_score: qualityData.breakdown.imageQuality,
        review_sentiment_score: qualityData.breakdown.reviewSentiment,
      }, { onConflict: 'tenant_id,product_id' });

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to save AI results' }, { status: 500 });
    }

    return NextResponse.json({ success: true, productId, provider: activeModel, result: { title: titleData, description: descData, seo: seoData, quality: qualityData } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('StyleMate AI error:', message);
    await supabase.from('ai_product_analysis').upsert(
      { tenant_id: TENANT_ID, product_id: productId, ai_model: activeModel, prompt_version: PROMPT_VERSION, stylemate_status: 'failed' },
      { onConflict: 'tenant_id,product_id' }
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
