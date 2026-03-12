import { NextRequest, NextResponse } from 'next/server';
import { requireCustomerAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getTenantIdFromRequest } from '@/lib/tenant';

// GET /api/orders — Customer order history (JWT-gated)
export async function GET(request: NextRequest) {
  const authResult = await requireCustomerAuth(request);
  if (!authResult.success || !authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = getTenantIdFromRequest(request);
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
  const limit = 10;
  const offset = (page - 1) * limit;

  const { data: orders, count, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, order_token, status, currency,
      total_usd, total_gbp, created_at, shipping_method,
      tracking_number, tracking_carrier,
      order_items(id, quantity, unit_price_usd, unit_price_gbp, total_price_usd, total_price_gbp, product_snapshot)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('user_id', authResult.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  return NextResponse.json({
    orders,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
