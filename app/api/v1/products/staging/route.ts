import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/adminAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = 1;

export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.success) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const storeId = request.nextUrl.searchParams.get('store_id') ?? String(TENANT_ID);
  const tenantId = parseInt(storeId, 10) || TENANT_ID;

  const { data, error } = await supabase
    .from('supplier_products')
    .select('id, raw_title, raw_description, raw_images, raw_rating, supplier_price_usd, supplier_category, shipping_days_us, ai_profit_score, suggested_retail_price_usd, estimated_margin_pct, processing_status, external_id')
    .eq('tenant_id', tenantId)
    .eq('processing_status', 'AI_PROCESSED')
    .order('id', { ascending: false });

  if (error) {
    console.error('Staging fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const products = (data ?? []).map((p) => ({
    id: p.id,
    raw_title: p.raw_title,
    raw_description: p.raw_description,
    raw_images: (p.raw_images as string[]) ?? [],
    raw_rating: Number(p.raw_rating ?? 0),
    cost_price: Number(p.supplier_price_usd ?? 0),
    suggested_retail_price: Number(p.suggested_retail_price_usd ?? p.supplier_price_usd ?? 0) * 1.3,
    estimated_margin: p.estimated_margin_pct ?? 30,
    ai_profit_score: p.ai_profit_score ?? Math.min(100, Math.round((p.raw_rating ?? 0) * 20)),
    shipping_speed_days: p.shipping_days_us ?? p.shipping_days_us ?? 14,
    status: p.processing_status,
    category: p.supplier_category ?? 'Uncategorized',
  }));

  return NextResponse.json(products);
}
