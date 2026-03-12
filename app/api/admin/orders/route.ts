import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getTenantIdFromRequest } from '@/lib/tenant';

// GET /api/admin/orders — All orders (paginated, filterable, CSV export)
export async function GET(request: NextRequest) {
  const authResult = await requireAdminRole(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = getTenantIdFromRequest(request);
  const params = request.nextUrl.searchParams;
  const page = parseInt(params.get('page') || '1');
  const limit = parseInt(params.get('limit') || '25');
  const offset = (page - 1) * limit;
  const status = params.get('status');
  const currency = params.get('currency');
  const search = params.get('search');
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');
  const exportCsv = params.get('export') === 'csv';

  let query = supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, order_token, status, currency,
      total_usd, total_gbp, created_at, updated_at,
      user_id, guest_email, shipping_address,
      tracking_number, tracking_carrier,
      stripe_payment_intent_id,
      discount_code_id, discount_amount_usd, discount_amount_gbp,
      refund_amount_usd, refund_amount_gbp, refund_reason,
      order_items(id, quantity, product_snapshot)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (currency) query = query.eq('currency', currency);
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo);
  if (search) {
    query = query.or(`order_number.ilike.%${search}%,guest_email.ilike.%${search}%`);
  }

  if (!exportCsv) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data: orders, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  // ── CSV Export ──
  if (exportCsv && orders) {
    const headers = ['Order Number', 'Date', 'Customer', 'Items', 'Currency', 'Total', 'Status', 'Tracking'];
    const rows = orders.map(o => [
      o.order_number,
      new Date(o.created_at).toLocaleDateString(),
      o.guest_email ?? `User #${o.user_id}`,
      (o.order_items as { quantity: number }[])?.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0) ?? 0,
      o.currency,
      o.currency === 'GBP' ? o.total_gbp.toFixed(2) : o.total_usd.toFixed(2),
      o.status,
      o.tracking_number ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="luxehaven-orders.csv"',
      },
    });
  }

  // ── Revenue stats ──
  const { data: stats } = await supabaseAdmin
    .from('orders')
    .select('total_usd, total_gbp, created_at, status')
    .eq('tenant_id', tenantId)
    .neq('status', 'CANCELLED');

  const today = new Date().toDateString();
  const todayOrders = stats?.filter(o => new Date(o.created_at).toDateString() === today) ?? [];
  const allOrders = stats ?? [];
  const totalRevenue = allOrders.reduce((s, o) => s + (o.total_usd ?? 0), 0);
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total_usd ?? 0), 0);
  const aov = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;

  // Abandoned cart stats
  const { count: abandonedCount } = await supabaseAdmin
    .from('checkout_sessions')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .lt('step_reached', 3)
    .is('recovered_at', null)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const { count: recoveredCount } = await supabaseAdmin
    .from('checkout_sessions')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .not('recovered_at', 'is', null);

  const { count: totalSessions } = await supabaseAdmin
    .from('checkout_sessions')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId);

  return NextResponse.json({
    orders,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
    stats: {
      totalRevenue: totalRevenue.toFixed(2),
      todayRevenue: todayRevenue.toFixed(2),
      totalOrders: allOrders.length,
      todayOrders: todayOrders.length,
      aov: aov.toFixed(2),
      abandonedCartsToday: abandonedCount ?? 0,
      recoveryRate: totalSessions ? (((recoveredCount ?? 0) / totalSessions) * 100).toFixed(1) : '0.0',
    },
  });
}
