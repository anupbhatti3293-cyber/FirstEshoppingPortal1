import { NextRequest, NextResponse } from 'next/server';
import { requireCustomerAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getTenantIdFromRequest } from '@/lib/tenant';

// GET /api/orders/[id] — Single order detail (JWT-gated)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireCustomerAuth(request);
  if (!authResult.success || !authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = getTenantIdFromRequest(request);
  const orderId = parseInt(params.id);

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      order_items(*),
      order_status_history(id, from_status, to_status, note, created_at)
    `)
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .eq('user_id', authResult.userId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({ order });
}
