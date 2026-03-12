import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/orders/[id]/tracking?token=[order_token]
// PUBLIC — no auth required, uses order_token for security
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.nextUrl.searchParams.get('token');
  const orderId = parseInt(params.id);

  if (!token || isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid tracking link' }, { status: 400 });
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, order_token, status, currency,
      shipping_method, tracking_number, tracking_carrier,
      estimated_delivery_date, created_at, updated_at,
      shipping_address,
      order_items(id, quantity, product_snapshot),
      order_status_history(id, to_status, note, created_at)
    `)
    .eq('id', orderId)
    .eq('order_token', token)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found or invalid tracking token' }, { status: 404 });
  }

  // Return only safe public fields — no email, no payment details
  const safeAddress = {
    firstName: order.shipping_address?.firstName,
    city: order.shipping_address?.city,
    postcode: order.shipping_address?.postcode ?? order.shipping_address?.zipCode,
    country: order.shipping_address?.country,
  };

  return NextResponse.json({
    order: {
      ...order,
      shipping_address: safeAddress,
      // Remove sensitive fields
      guest_email: undefined,
      user_id: undefined,
    },
  });
}
