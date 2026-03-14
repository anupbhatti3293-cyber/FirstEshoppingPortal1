import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/adminAuth';
import { callAI, parseAIJson, getProviderMeta, getActiveProvider, type AIProvider } from '@/lib/aiProvider';
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

// Token limits — generous to prevent truncation
// Gemini pretty-prints JSON with spaces/newlines which uses more tokens
const TOKENS = {
  title:   800,   // ~100 chars × 2 locales, plus JSON structure
  desc:    2000,  // 300-500 words × 2 locales
  seo:     2500,  // meta + tags + 5 FAQs × 2 locales
  quality: 1000,  // score + breakdown + notes
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminRole(request);
    if (!auth.success) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

    const parsed = OptimiseRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { productId } = parsed.data;
    const providerOverride = (body as Record<string, unknown>)?.provider as AIProvider | undefined;
    const provider = providerOverride ?? getActiveProvider();
    const activeModel = getProviderMeta(provider).model;

    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`id, name, description, short_description, category,
        base_price_usd, base_price_gbp, tags, rating_average, rating_count, stock_quantity,
        product_images(url, alt_text)`)
      .eq('id', productId)
      .eq('tenant_id', TENANT_ID)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: `Product not found: ${productError?.message ?? 'unknown'}` }, { status: 404 });
    }

    const imageCount = Array.isArray(product.product_images) ? product.product_images.length : 0;

    // ── Prompts ───────────────────────────────────────────────────────
    const titleSystem = `You are a conversion copywriter for LuxeHaven, a premium US/UK dropshipping store.
Brand voice: luxurious, trustworthy, aspirational.
Return ONLY a valid JSON object with no extra text:
{ "us": "title for US market", "uk": "title for UK market" }
Rules: Emotional hook + key feature + trust signal. No supplier names, no keyword stuffing.`;

    const descSystem = `You are a conversion copywriter for LuxeHaven, a premium US/UK dropshipping store.
Return ONLY a valid JSON object with no extra text:
{ "us": { "full": "300-500 word description", "short": "under 100 word summary" }, "uk": { "full": "300-500 word description", "short": "under 100 word summary" } }
Structure: Hook → Problem solved → 3-5 benefits → Social proof → CTA.
US: American English, lifestyle-forward. UK: British English (colour/favourite/organise), quality-focused.`;

    const seoSystem = `You are an SEO specialist for LuxeHaven, a premium US/UK dropshipping store.
Return ONLY a valid JSON object with no extra text:
{
  "us": { "metaTitle": "max 60 chars", "metaDescription": "max 160 chars", "tags": ["tag1","tag2","tag3","tag4","tag5"], "faq": [{"q":"question","a":"answer"},{"q":"question","a":"answer"},{"q":"question","a":"answer"},{"q":"question","a":"answer"},{"q":"question","a":"answer"}] },
  "uk": { "metaTitle": "max 60 chars", "metaDescription": "max 160 chars", "tags": ["tag1","tag2","tag3","tag4","tag5"], "faq": [{"q":"question","a":"answer"},{"q":"question","a":"answer"},{"q":"question","a":"answer"},{"q":"question","a":"answer"},{"q":"question","a":"answer"}] }
}`;

    const qualitySystem = `You are a product quality analyst for LuxeHaven.
Return ONLY a valid JSON object with no extra text:
{ "score": 75, "breakdown": { "descriptionQuality": 18, "imageQuality": 15, "supplierReliability": 14, "reviewSentiment": 16, "marketDemand": 12 }, "badge": "qa_approved", "notes": "brief notes here" }
Badge rules: 0-49=none, 50-69=verified, 70-84=qa_approved, 85-100=engineer_tested.`;

    const base = `Product: ${product.name}
Category: ${product.category}
Price: $${product.base_price_usd} USD / £${product.base_price_gbp} GBP
Rating: ${product.rating_average}/5 from ${product.rating_count} reviews
Description: ${product.description ?? 'Not provided'}`;

    // Run all 4 AI calls in parallel with generous token limits
    const [titleRaw, descRaw, seoRaw, qualityRaw] = await Promise.all([
      callAI(titleSystem, base, TOKENS.title, provider),
      callAI(descSystem, base, TOKENS.desc, provider),
      callAI(seoSystem, `${base}\nExisting tags: ${(product.tags ?? []).join(', ')}`, TOKENS.seo, provider),
      callAI(qualitySystem, `${base}\nImage count: ${imageCount}\nStock: ${product.stock_quantity}`, TOKENS.quality, provider),
    ]);

    // Parse with detailed per-field error reporting
    let titleData: TitleOutput;
    let descData: DescriptionOutput;
    let seoData: SeoOutput;
    let qualityData: QualityOutput;

    try { titleData = TitleOutputSchema.parse(parseAIJson<TitleOutput>(titleRaw)); }
    catch (e) { throw new Error(`Title parse failed: ${e instanceof Error ? e.message : String(e)} | Raw: ${titleRaw.slice(0, 300)}`); }

    try { descData = DescriptionOutputSchema.parse(parseAIJson<DescriptionOutput>(descRaw)); }
    catch (e) { throw new Error(`Description parse failed: ${e instanceof Error ? e.message : String(e)} | Raw: ${descRaw.slice(0, 300)}`); }

    try { seoData = SeoOutputSchema.parse(parseAIJson<SeoOutput>(seoRaw)); }
    catch (e) { throw new Error(`SEO parse failed: ${e instanceof Error ? e.message : String(e)} | Raw: ${seoRaw.slice(0, 300)}`); }

    try { qualityData = QualityOutputSchema.parse(parseAIJson<QualityOutput>(qualityRaw)); }
    catch (e) { throw new Error(`Quality parse failed: ${e instanceof Error ? e.message : String(e)} | Raw: ${qualityRaw.slice(0, 300)}`); }

    const { error: upsertError } = await supabase
      .from('ai_product_analysis')
      .upsert({
        tenant_id: TENANT_ID,
        product_id: productId,
        ai_model: activeModel,
        prompt_version: PROMPT_VERSION,
        stylemate_status: 'completed',
        ai_title_us: titleData!.us,
        ai_title_uk: titleData!.uk,
        ai_description_us: descData!.us.full,
        ai_description_uk: descData!.uk.full,
        ai_short_desc_us: descData!.us.short,
        ai_short_desc_uk: descData!.uk.short,
        ai_seo_title_us: seoData!.us.metaTitle,
        ai_seo_title_uk: seoData!.uk.metaTitle,
        ai_seo_desc_us: seoData!.us.metaDescription,
        ai_seo_desc_uk: seoData!.uk.metaDescription,
        ai_tags_us: seoData!.us.tags,
        ai_tags_uk: seoData!.uk.tags,
        ai_faq_us: seoData!.us.faq,
        ai_faq_uk: seoData!.uk.faq,
        quality_score: qualityData!.score,
        description_quality_score: qualityData!.breakdown.descriptionQuality,
        image_quality_score: qualityData!.breakdown.imageQuality,
        review_sentiment_score: qualityData!.breakdown.reviewSentiment,
      }, { onConflict: 'tenant_id,product_id' });

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return NextResponse.json({ error: `DB save failed: ${upsertError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      productId,
      provider: activeModel,
      result: {
        title: titleData!,
        description: descData!,
        seo: seoData!,
        quality: qualityData!,
      },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('StyleMate analyse error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
