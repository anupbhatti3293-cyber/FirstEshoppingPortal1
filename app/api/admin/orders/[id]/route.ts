import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getTenantIdFromRequest } from '@/lib/tenant';
import { sendShippingConfirmationEmail } from '@/lib/resend';
import type { Order } from '@/types';

// GET /api/admin/orders/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminRole(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = getTenantIdFromRequest(request);
  const orderId = parseInt(params.id);

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*), order_status_history(*)')
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({ order });
}

// PATCH /api/admin/orders/[id] — Update status + tracking
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminRole(request);
  if (!authResult.success || !authResult.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = getTenantIdFromRequest(request);
  const orderId = parseInt(params.id);
  const body = await request.json() as {
    status?: string;
    tracking_number?: string;
    tracking_carrier?: string;
    note?: string;
  };

  // Fetch current order to get previous status
  const { data: currentOrder } = await supabaseAdmin
    .from('orders')
    .select('id, status, order_token, guest_email, shipping_address, shipping_method, order_items(product_snapshot)')
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!currentOrder) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) updateData.status = body.status;
  if (body.tracking_number !== undefined) updateData.tracking_number = body.tracking_number;
  if (body.tracking_carrier !== undefined) updateData.tracking_carrier = body.tracking_carrier;

  const { data: updatedOrder, error } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }

  // Log status change
  if (body.status && body.status !== currentOrder.status) {
    await supabaseAdmin.from('order_status_history').insert({
      tenant_id: tenantId,
      order_id: orderId,
      from_status: currentOrder.status,
      to_status: body.status,
      admin_id: authResult.adminId,
      note: body.note || null,
    });

    // ── Send shipping email when status → SHIPPED ──
    if (body.status === 'SHIPPED' && body.tracking_number) {
      try {
        await sendShippingConfirmationEmail(
          currentOrder as unknown as Order,
          body.tracking_number,
          body.tracking_carrier || 'Standard Post'
        );
      } catch (emailErr) {
        console.error('Failed to send shipping email:', emailErr);
      }
    }
  }

  return NextResponse.json({ order: updatedOrder });
}
