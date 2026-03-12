import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type Stripe from 'stripe';
import type { CartLineItem, ShippingAddress } from '@/types';

// CRITICAL: Disable Next.js body parsing — Stripe needs the raw body for signature verification
export const config = { api: { bodyParser: false } };

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Get raw body for Stripe signature verification
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Only handle payment_intent.succeeded for now
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    await handlePaymentSuccess(paymentIntent);
  }

  // Always return 200 to Stripe — never let webhook errors cause retries for unhandled events
  return NextResponse.json({ received: true });
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const meta = paymentIntent.metadata;
  const tenantId = parseInt(meta.tenantId || '1');
  const userId = meta.userId !== 'guest' ? meta.userId : null;
  const shippingMethod = (meta.shippingMethod || 'STANDARD') as 'STANDARD' | 'EXPRESS';
  const discountCodeId = meta.discountCodeId ? parseInt(meta.discountCodeId) : null;
  const checkoutSessionId = meta.checkoutSessionId ? parseInt(meta.checkoutSessionId) : null;
  const currency = meta.currency || 'USD';

  // ── IDEMPOTENCY CHECK — prevent duplicate orders from webhook retries ──
  const { data: existingOrder } = await supabaseAdmin
    .from('orders')
    .select('id, order_number')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .maybeSingle();

  if (existingOrder) {
    console.log(`Order already exists for PaymentIntent ${paymentIntent.id}: ${existingOrder.order_number}`);
    return; // Already processed — idempotent
  }

  // ── Generate order number ──
  const { data: orderNumberData } = await supabaseAdmin
    .rpc('generate_order_number', { p_tenant_id: tenantId });
  const orderNumber = orderNumberData || `LH-${Date.now()}`;

  // ── Get shipping address from checkout session ──
  let shippingAddress: ShippingAddress = {
    firstName: '', lastName: '', email: '', phone: '',
    line1: '', line2: null, city: '',
    county: null, state: null, postcode: null, zipCode: null,
    country: 'US',
  };

  if (checkoutSessionId) {
    const { data: checkoutSession } = await supabaseAdmin
      .from('checkout_sessions')
      .select('email, cart_snapshot')
      .eq('id', checkoutSessionId)
      .maybeSingle();

    if (checkoutSession) {
      // Get shipping address stored in payment intent
      const piShippingAddress = paymentIntent.shipping;
      if (piShippingAddress?.address) {
        shippingAddress = {
          firstName: piShippingAddress.name?.split(' ')[0] || '',
          lastName: piShippingAddress.name?.split(' ').slice(1).join(' ') || '',
          email: checkoutSession.email,
          phone: piShippingAddress.phone || '',
          line1: piShippingAddress.address.line1 || '',
          line2: piShippingAddress.address.line2 || null,
          city: piShippingAddress.address.city || '',
          county: null,
          state: piShippingAddress.address.state || null,
          postcode: piShippingAddress.address.postal_code || null,
          zipCode: piShippingAddress.address.postal_code || null,
          country: piShippingAddress.address.country || 'US',
        };
      }
    }
  }

  // ── Parse cart snapshot from metadata ──
  let cartItems: CartLineItem[] = [];
  try {
    cartItems = JSON.parse(meta.cartSnapshot || '[]');
  } catch { cartItems = []; }

  // ── Get full cart if snapshot is truncated (Stripe 500 char limit) ──
  if (cartItems.length === 0 && userId) {
    const { data: dbCart } = await supabaseAdmin
      .from('cart_items')
      .select('product_id, variant_id, quantity')
      .eq('user_id', userId);
    if (dbCart) {
      cartItems = dbCart.map(i => ({
        productId: i.product_id,
        variantId: i.variant_id,
        quantity: i.quantity,
        name: '', slug: '', imageUrl: null, sku: '', variantLabel: null,
        priceUsd: 0, priceGbp: 0, stockQuantity: 0,
      }));
    }
  }

  // ── Get product details for order_items snapshot ──
  const productIds = cartItems.map(i => i.productId).filter(Boolean);
  const { data: products } = productIds.length > 0
    ? await supabaseAdmin
        .from('products')
        .select('id, name, slug, base_price_usd, base_price_gbp, sale_price_usd, sale_price_gbp, product_images(url, is_primary)')
        .in('id', productIds)
    : { data: [] };

  // ── Retrieve payment method details ──
  let last4: string | null = null;
  let brand: string | null = null;
  if (paymentIntent.latest_charge) {
    try {
      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
      last4 = charge.payment_method_details?.card?.last4 ?? null;
      brand = charge.payment_method_details?.card?.brand ?? null;
    } catch { /* non-critical */ }
  }

  // ── Create order ──
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      tenant_id: tenantId,
      order_number: orderNumber,
      user_id: userId ? parseInt(userId) : null,
      guest_email: userId ? null : shippingAddress.email,
      status: 'PROCESSING',
      currency,
      subtotal_usd: parseFloat(meta.subtotalUsd || '0'),
      subtotal_gbp: parseFloat(meta.subtotalGbp || '0'),
      shipping_cost_usd: parseFloat(meta.shippingUsd || '0'),
      shipping_cost_gbp: parseFloat(meta.shippingGbp || '0'),
      vat_amount_usd: 0,
      vat_amount_gbp: parseFloat(meta.vatGbp || '0'),
      discount_amount_usd: parseFloat(meta.discountAmountUsd || '0'),
      discount_amount_gbp: parseFloat(meta.discountAmountGbp || '0'),
      total_usd: parseFloat(meta.totalUsd || '0'),
      total_gbp: parseFloat(meta.totalGbp || '0'),
      discount_code_id: discountCodeId,
      shipping_method: shippingMethod,
      shipping_address: shippingAddress,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: paymentIntent.latest_charge as string | null,
      payment_method_last4: last4,
      payment_method_brand: brand,
      checkout_session_id: checkoutSessionId,
    })
    .select('id, order_number, order_token')
    .single();

  if (orderError || !order) {
    console.error('Failed to create order:', orderError);
    return;
  }

  // ── Create order items ──
  if (cartItems.length > 0) {
    const orderItems = cartItems.map(item => {
      const product = products?.find(p => p.id === item.productId);
      const primaryImg = (product?.product_images as { url: string; is_primary: boolean }[] | undefined)
        ?.find(i => i.is_primary)?.url
        ?? (product?.product_images as { url: string }[] | undefined)?.[0]?.url
        ?? null;

      const priceUsd = product?.sale_price_usd ?? product?.base_price_usd ?? item.priceUsd;
      const priceGbp = product?.sale_price_gbp ?? product?.base_price_gbp ?? item.priceGbp;

      return {
        tenant_id: tenantId,
        order_id: order.id,
        product_id: item.productId,
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price_usd: priceUsd,
        unit_price_gbp: priceGbp,
        total_price_usd: priceUsd * item.quantity,
        total_price_gbp: priceGbp * item.quantity,
        product_snapshot: {
          name: product?.name ?? item.name,
          slug: product?.slug ?? item.slug,
          image_url: primaryImg ?? item.imageUrl,
          sku: item.sku,
          variant_label: item.variantLabel,
        },
      };
    });

    await supabaseAdmin.from('order_items').insert(orderItems);
  }

  // ── Log initial status history ──
  await supabaseAdmin.from('order_status_history').insert({
    tenant_id: tenantId,
    order_id: order.id,
    from_status: null,
    to_status: 'PROCESSING',
    note: 'Payment confirmed via Stripe',
    metadata: { stripe_payment_intent_id: paymentIntent.id },
  });

  // ── Increment discount code usage ──
  if (discountCodeId) {
    // Increment discount usage count directly
    const { data: currentDiscount } = await supabaseAdmin
      .from('discount_codes')
      .select('uses_count')
      .eq('id', discountCodeId)
      .single();
    if (currentDiscount) {
      await supabaseAdmin
        .from('discount_codes')
        .update({ uses_count: currentDiscount.uses_count + 1 })
        .eq('id', discountCodeId);
    }

    await supabaseAdmin.from('discount_redemptions').insert({
      tenant_id: tenantId,
      discount_code_id: discountCodeId,
      order_id: order.id,
      user_id: userId ? parseInt(userId) : null,
      redeemed_at: new Date().toISOString(),
    });
  }

  // ── Clear DB cart for logged-in users ──
  if (userId) {
    await supabaseAdmin.from('cart_items').delete().eq('user_id', userId);
  }

  // ── Mark checkout session as recovered ──
  if (checkoutSessionId) {
    await supabaseAdmin.from('checkout_sessions')
      .update({ recovered_at: new Date().toISOString(), step_reached: 3 })
      .eq('id', checkoutSessionId);
  }

  // ── Auto-fulfilment signal to supplier (if configured) ──
  try {
    const { data: supplierIntegration } = await supabaseAdmin
      .from('supplier_integrations')
      .select('base_url, config')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle();

    if (supplierIntegration?.base_url) {
      // Validate URL is https before calling (prevent SSRF)
      const supplierUrl = new URL(supplierIntegration.base_url);
      if (supplierUrl.protocol === 'https:') {
        await fetch(`${supplierIntegration.base_url}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: order.order_number,
            orderId: order.id,
            items: cartItems,
            shippingAddress,
          }),
          signal: AbortSignal.timeout(5000), // 5s timeout
        }).catch(err => console.warn('Supplier fulfilment signal failed:', err));
      }
    }
  } catch { /* non-critical — don't let this fail the webhook */ }

  console.log(`✅ Order created: ${order.order_number} (PI: ${paymentIntent.id})`);
}
