import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getTenantIdFromRequest } from '@/lib/tenant';
import { stripe } from '@/lib/stripe';
import { sendRefundConfirmationEmail } from '@/lib/resend';
import type { Order } from '@/types';

// POST /api/admin/orders/[id]/refund
export async function POST(
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
    amount: number;   // in dollars/pounds (e.g. 29.99)
    reason: string;
    currency: string;
  };

  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'Refund amount must be greater than 0' }, { status: 400 });
  }
  if (!body.reason?.trim()) {
    return NextResponse.json({ error: 'Refund reason is required' }, { status: 400 });
  }

  // Fetch order
  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (!order.stripe_payment_intent_id) {
    return NextResponse.json({ error: 'No Stripe payment found for this order' }, { status: 400 });
  }

  if (order.status === 'REFUNDED') {
    return NextResponse.json({ error: 'Order is already fully refunded' }, { status: 400 });
  }

  // Convert amount to Stripe cents/pence
  const amountInSmallestUnit = Math.round(body.amount * 100);
  const totalInOrder = order.currency === 'GBP' ? order.total_gbp : order.total_usd;
  const existingRefund = order.currency === 'GBP' ? (order.refund_amount_gbp ?? 0) : (order.refund_amount_usd ?? 0);
  const maxRefundable = totalInOrder - existingRefund;

  if (body.amount > maxRefundable + 0.01) {
    return NextResponse.json(
      { error: `Cannot refund more than ${maxRefundable.toFixed(2)} ${order.currency}` },
      { status: 400 }
    );
  }

  // Issue Stripe refund
  let stripeRefund;
  try {
    stripeRefund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: amountInSmallestUnit,
      reason: 'requested_by_customer',
      metadata: { orderId: String(orderId), adminId: String(authResult.adminId), reason: body.reason },
    });
  } catch (stripeErr) {
    console.error('Stripe refund error:', stripeErr);
    return NextResponse.json({ error: 'Stripe refund failed — check Stripe dashboard' }, { status: 502 });
  }

  // Determine new status
  const isFullRefund = body.amount >= maxRefundable - 0.01;
  const newStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
  const newRefundTotal = existingRefund + body.amount;

  // Update order
  const refundAmountField = order.currency === 'GBP' ? 'refund_amount_gbp' : 'refund_amount_usd';
  await supabaseAdmin
    .from('orders')
    .update({
      status: newStatus,
      [refundAmountField]: newRefundTotal,
      refund_reason: body.reason,
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  // Log to status history
  await supabaseAdmin.from('order_status_history').insert({
    tenant_id: tenantId,
    order_id: orderId,
    from_status: order.status,
    to_status: newStatus,
    admin_id: authResult.adminId,
    note: `Refund issued: ${order.currency === 'GBP' ? '£' : '$'}${body.amount.toFixed(2)} — ${body.reason}`,
    metadata: { stripe_refund_id: stripeRefund.id, amount: body.amount },
  });

  // Send refund confirmation email
  try {
    await sendRefundConfirmationEmail(order as unknown as Order, body.amount, body.reason);
  } catch (emailErr) {
    console.error('Failed to send refund email:', emailErr);
  }

  return NextResponse.json({
    success: true,
    refundId: stripeRefund.id,
    newStatus,
    amountRefunded: body.amount,
  });
}
