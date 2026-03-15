import { createClient, SupabaseClient } from '@supabase/supabase-js';

function mapCategory(supplierCat: string | null): string {
  const m: Record<string, string> = {
    jewellery: 'jewellery', jewelery: 'jewellery',
    "men's clothing": 'clothing', "women's clothing": 'clothing', clothing: 'clothing',
    electronics: 'beauty', beauty: 'beauty',
    purses: 'purses-bags', bags: 'purses-bags',
  };
  const key = (supplierCat ?? '').toLowerCase().trim();
  return m[key] ?? 'beauty';
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function uniqueSlug(base: string, existing: string[]): string {
  let slug = slugify(base);
  let candidate = slug;
  let i = 1;
  while (existing.includes(candidate)) {
    candidate = `${slug}-${i}`;
    i++;
  }
  return candidate;
}

export interface ProcessResult {
  success: boolean;
  productId?: number;
  error?: string;
}

export interface ProcessOptions {
  isAutomation?: boolean;
  /** When true, logs AUTO_PUBLISH_AI_CONFIRMED (AI orchestrator used). Default: AUTO_PUBLISH_TRIGGERED */
  useAIConfirmed?: boolean;
}

export async function processSingleProduct(
  supabase: SupabaseClient,
  spId: number,
  storeId: number,
  userId: number,
  options?: ProcessOptions
): Promise<ProcessResult> {
  const isAutomation = options?.isAutomation ?? false;
  const useAIConfirmed = options?.useAIConfirmed ?? false;
  const logUserId = isAutomation ? 0 : userId;
  const logAction = isAutomation
    ? (useAIConfirmed ? 'AUTO_PUBLISH_AI_CONFIRMED' : 'AUTO_PUBLISH_TRIGGERED')
    : 'BULK_APPROVE';
  try {
    const { data: sp, error: fetchErr } = await supabase
      .from('supplier_products')
      .select('*')
      .eq('id', spId)
      .eq('tenant_id', storeId)
      .in('processing_status', ['AI_PROCESSED', 'AUTO_PUBLISHING'])
      .single();

    if (fetchErr || !sp) {
      return { success: false, error: 'Product not found or already processed' };
    }

    const costPrice = Number(sp.supplier_price_usd ?? 0);
    const marginPct = 40;
    const retailPrice = costPrice > 0 ? costPrice * (1 + marginPct / 100) : 29.99;
    const aiScore = sp.ai_profit_score ?? Math.min(100, Math.round((Number(sp.raw_rating) || 0) * 20));

    const { data: existingSlugs } = await supabase
      .from('products')
      .select('slug')
      .eq('tenant_id', storeId);
    const slugs = (existingSlugs ?? []).map((r) => r.slug);

    const name = sp.raw_title ?? 'Untitled Product';
    const slug = uniqueSlug(name, slugs);
    const sku = `SP-${sp.external_id}-${Date.now()}`;

    const { data: newProduct, error: insertErr } = await supabase
      .from('products')
      .insert({
        tenant_id: storeId,
        name,
        slug,
        description: sp.raw_description ?? '',
        short_description: (sp.raw_description ?? '').slice(0, 200),
        category: mapCategory(sp.supplier_category),
        sku,
        base_price_usd: Math.round(retailPrice * 100) / 100,
        base_price_gbp: Math.round(retailPrice * 0.79 * 100) / 100,
        cost_price: costPrice,
        stock_quantity: 99,
        is_active: true,
        rating_average: sp.raw_rating ?? 0,
        rating_count: 0,
      })
      .select('id')
      .single();

    if (insertErr) return { success: false, error: insertErr.message };

    const productId = newProduct?.id;
    const images = typeof sp.raw_images === 'string' ? JSON.parse(sp.raw_images || '[]') : (sp.raw_images ?? []);
    const firstImg = Array.isArray(images) ? images[0] : null;
    if (firstImg && productId) {
      const imgUrl = typeof firstImg === 'string' ? firstImg : firstImg?.url ?? firstImg;
      if (imgUrl) {
        await supabase.from('product_images').insert({
          tenant_id: storeId,
          product_id: productId,
          url: imgUrl,
          alt_text: name,
          position: 0,
        });
      }
    }

    await supabase
      .from('supplier_products')
      .update({
        processing_status: 'LIVE',
        status: 'published',
        linked_product_id: productId,
        processed_at: new Date().toISOString(),
      })
      .eq('id', spId)
      .eq('tenant_id', storeId);

    await supabase.from('system_logs').insert({
      tenant_id: storeId,
      user_id: logUserId,
      product_id: productId,
      supplier_product_id: spId,
      action: logAction,
      ai_score: aiScore,
      metadata: { margin_pct: marginPct, triggered_by: isAutomation ? 'automation_engine' : 'admin' },
    });

    return { success: true, productId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
