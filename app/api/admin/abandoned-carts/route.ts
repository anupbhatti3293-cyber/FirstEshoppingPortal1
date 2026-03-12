import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getTenantIdFromRequest } from '@/lib/tenant';

// GET /api/admin/abandoned-carts
export async function GET(request: NextRequest) {
  const authResult = await requireAdminRole(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = getTenantIdFromRequest(request);
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
  const limit = 25;
  const offset = (page - 1) * limit;

  const { data: sessions, count } = await supabaseAdmin
    .from('checkout_sessions')
    .select(
      'id, email, cart_snapshot, step_reached, created_at, recovered_at, abandoned_email_1_sent_at, abandoned_email_2_sent_at',
      { count: 'exact' }
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Stats
  const { count: totalAbandoned } = await supabaseAdmin
    .from('checkout_sessions')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .lt('step_reached', 3)
    .is('recovered_at', null);

  const { count: recoveredCount } = await supabaseAdmin
    .from('checkout_sessions')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .not('recovered_at', 'is', null);

  const { count: totalCount } = await supabaseAdmin
    .from('checkout_sessions')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: abandonedToday } = await supabaseAdmin
    .from('checkout_sessions')
    .select('id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .lt('step_reached', 3)
    .is('recovered_at', null)
    .gte('created_at', today.toISOString());

  // Recovered revenue (approximate from order totals)
  const { data: recoveredOrders } = await supabaseAdmin
    .from('orders')
    .select('total_usd')
    .eq('tenant_id', tenantId)
    .not('checkout_session_id', 'is', null);

  const recoveredRevenue = (recoveredOrders ?? []).reduce((s, o) => s + (o.total_usd ?? 0), 0);

  return NextResponse.json({
    sessions,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
    stats: {
      totalAbandoned: totalAbandoned ?? 0,
      recoveredCount: recoveredCount ?? 0,
      recoveryRate: totalCount ? (((recoveredCount ?? 0) / totalCount) * 100).toFixed(1) : '0.0',
      abandonedToday: abandonedToday ?? 0,
      recoveredRevenue: recoveredRevenue.toFixed(2),
    },
  });
}
