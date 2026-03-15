import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/adminAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 1;

function mapCategory(supplierCat: string | null): string {
  const m: Record<string, string> = {
    jewellery: 'jewellery', jewelery: 'jewellery',
    'men\'s clothing': 'clothing', 'women\'s clothing': 'clothing', clothing: 'clothing',
    electronics: 'beauty', beauty: 'beauty',
    'purses': 'purses-bags', bags: 'purses-bags',
  };
  const key = (supplierCat ?? '').toLowerCase().trim();
  return m[key] ?? 'beauty';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.success) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = body as { product_ids?: number[]; store_id?: number; user_id?: number };
  const productIds = Array.isArray(parsed.product_ids) ? parsed.product_ids : [];
  const storeId = parsed.store_id ?? TENANT_ID;
  const userId = parsed.user_id ?? auth.adminId ?? 0;

  if (productIds.length === 0) {
    return NextResponse.json({ error: 'No products selected.' }, { status: 400 });
  }

  const results: { id: number; success: boolean; productId?: number; error?: string }[] = [];

  for (const spId of productIds) {
    try {
      const { data: sp, error: fetchErr } = await supabase
        .from('supplier_products')
        .select('*')
        .eq('id', spId)
        .eq('tenant_id', storeId)
        .eq('processing_status', 'AI_PROCESSED')
        .single();

      if (fetchErr || !sp) {
        results.push({ id: spId, success: false, error: 'Product not found or already processed' });
        continue;
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

      if (insertErr) {
        results.push({ id: spId, success: false, error: insertErr.message });
        continue;
      }

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
          linked_product_id: productId,
          processed_at: new Date().toISOString(),
        })
        .eq('id', spId)
        .eq('tenant_id', storeId);

      await supabase.from('system_logs').insert({
        tenant_id: storeId,
        user_id: userId,
        product_id: productId,
        supplier_product_id: spId,
        action: 'BULK_APPROVE',
        ai_score: aiScore,
        metadata: { margin_pct: marginPct },
      });

      results.push({ id: spId, success: true, productId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id: spId, success: false, error: msg });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({
    status: 'success',
    message: `${successCount} of ${productIds.length} products approved.`,
    results,
  });
}
