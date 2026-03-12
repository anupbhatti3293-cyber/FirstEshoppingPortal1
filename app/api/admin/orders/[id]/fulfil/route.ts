import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getTenantIdFromRequest } from '@/lib/tenant';

// POST /api/admin/orders/[id]/fulfil — Fire auto-fulfilment signal to supplier
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminRole(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = getTenantIdFromRequest(request);
  const orderId = parseInt(params.id);

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { data: supplier } = await supabaseAdmin
    .from('supplier_integrations')
    .select('base_url, display_name')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle();

  if (!supplier?.base_url) {
    return NextResponse.json({ error: 'No active supplier integration configured' }, { status: 400 });
  }

  // Validate URL is HTTPS (SSRF prevention)
  let webhookUrl: URL;
  try {
    webhookUrl = new URL(supplier.base_url);
    if (webhookUrl.protocol !== 'https:') throw new Error('Must be HTTPS');
  } catch {
    return NextResponse.json({ error: 'Invalid supplier webhook URL' }, { status: 400 });
  }

  try {
    const response = await fetch(`${webhookUrl.origin}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: order.order_number,
        orderId: order.id,
        items: order.order_items,
        shippingAddress: order.shipping_address,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Supplier returned ${response.status}` },
        { status: 502 }
      );
    }

    // Log the signal
    await supabaseAdmin.from('order_status_history').insert({
      tenant_id: tenantId,
      order_id: orderId,
      from_status: order.status,
      to_status: order.status,
      admin_id: authResult.adminId,
      note: `Fulfilment signal sent to ${supplier.display_name}`,
    });

    return NextResponse.json({ success: true, supplier: supplier.display_name });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to reach supplier: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 502 }
    );
  }
}
