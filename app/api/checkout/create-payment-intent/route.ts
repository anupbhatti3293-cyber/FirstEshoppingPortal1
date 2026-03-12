import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSession } from '@/lib/auth';
import { getTenantIdFromRequest } from '@/lib/tenant';
import type { CartLineItem, ShippingMethod } from '@/types';

const FREE_SHIPPING_USD = 50;
const FREE_SHIPPING_GBP = 40;
const STANDARD_SHIPPING_USD = 4.99;
const STANDARD_SHIPPING_GBP = 3.99;
const EXPRESS_SHIPPING_USD = 14.99;
const EXPRESS_SHIPPING_GBP = 11.99;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cartItems,
      currency,
      shippingMethod,
      discountCode,
      checkoutSessionId,
    }: {
      cartItems: CartLineItem[];
      currency: string;
      shippingMethod: ShippingMethod;
      discountCode?: string;
      checkoutSessionId?: number;
    } = body;

    if (!cartItems?.length) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const token = request.cookies.get('auth-token')?.value;
    const session = await getSession(token);
    const isGBP = currency === 'GBP';

    // ── CRITICAL: Recalculate totals server-side from DB — NEVER trust client prices ──
    const productIds = cartItems.map(i => i.productId);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, base_price_usd, base_price_gbp, sale_price_usd, sale_price_gbp, stock_quantity, allow_backorder, name, slug')
      .in('id', productIds)
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (productsError || !products) {
      return NextResponse.json({ success: false, error: 'Failed to verify products' }, { status: 500 });
    }

    // Build server-verified line items
    let subtotalUsd = 0;
    let subtotalGbp = 0;

    for (const cartItem of cartItems) {
      const product = products.find(p => p.id === cartItem.productId);
      if (!product) {
        return NextResponse.json({ success: false, error: `Product ${cartItem.productId} not found or unavailable` }, { status: 400 });
      }
      if (!product.allow_backorder && product.stock_quantity < cartItem.quantity) {
        return NextResponse.json({ success: false, error: `${product.name} is out of stock` }, { status: 400 });
      }
      const priceUsd = product.sale_price_usd ?? product.base_price_usd;
      const priceGbp = product.sale_price_gbp ?? product.base_price_gbp;
      subtotalUsd += priceUsd * cartItem.quantity;
      subtotalGbp += priceGbp * cartItem.quantity;
    }

    // ── Shipping ──
    let shippingUsd = 0;
    let shippingGbp = 0;
    if (shippingMethod === 'EXPRESS') {
      shippingUsd = EXPRESS_SHIPPING_USD;
      shippingGbp = EXPRESS_SHIPPING_GBP;
    } else {
      shippingUsd = subtotalUsd >= FREE_SHIPPING_USD ? 0 : STANDARD_SHIPPING_USD;
      shippingGbp = subtotalGbp >= FREE_SHIPPING_GBP ? 0 : STANDARD_SHIPPING_GBP;
    }

    // ── VAT (UK only, 20%) ──
    const vatGbp = isGBP ? subtotalGbp * 0.2 : 0;
    const vatUsd = 0;

    // ── Discount (server-side validation) ──
    let discountAmountUsd = 0;
    let discountAmountGbp = 0;
    let discountCodeId: number | null = null;

    if (discountCode) {
      const { data: discount } = await supabaseAdmin
        .from('discount_codes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('code', discountCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (discount) {
        const now = new Date();
        const isValid =
          (!discount.starts_at || new Date(discount.starts_at) <= now) &&
          (!discount.expires_at || new Date(discount.expires_at) >= now) &&
          (discount.max_uses === null || discount.uses_count < discount.max_uses);

        if (isValid) {
          discountCodeId = discount.id;
          if (discount.discount_type === 'PERCENTAGE') {
            discountAmountUsd = (subtotalUsd * discount.value) / 100;
            discountAmountGbp = (subtotalGbp * discount.value) / 100;
          } else if (discount.discount_type === 'FIXED_AMOUNT') {
            discountAmountUsd = Math.min(discount.value, subtotalUsd);
            discountAmountGbp = Math.min(discount.value * 0.8, subtotalGbp);
          } else if (discount.discount_type === 'FREE_SHIPPING') {
            shippingUsd = 0;
            shippingGbp = 0;
          }
        }
      }
    }

    // ── Final totals ──
    const totalUsd = Math.max(0, subtotalUsd - discountAmountUsd + shippingUsd + vatUsd);
    const totalGbp = Math.max(0, subtotalGbp - discountAmountGbp + shippingGbp + vatGbp);

    // Stripe expects amount in smallest currency unit (pence/cents)
    const stripeAmount = Math.round((isGBP ? totalGbp : totalUsd) * 100);
    const stripeCurrency = isGBP ? 'gbp' : 'usd';

    // ── Create Stripe PaymentIntent ──
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: stripeCurrency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        tenantId: String(tenantId),
        userId: session?.user.id ?? 'guest',
        shippingMethod,
        discountCodeId: discountCodeId ? String(discountCodeId) : '',
        checkoutSessionId: checkoutSessionId ? String(checkoutSessionId) : '',
        // Store pricing snapshot for webhook
        subtotalUsd: subtotalUsd.toFixed(2),
        subtotalGbp: subtotalGbp.toFixed(2),
        shippingUsd: shippingUsd.toFixed(2),
        shippingGbp: shippingGbp.toFixed(2),
        vatGbp: vatGbp.toFixed(2),
        discountAmountUsd: discountAmountUsd.toFixed(2),
        discountAmountGbp: discountAmountGbp.toFixed(2),
        totalUsd: totalUsd.toFixed(2),
        totalGbp: totalGbp.toFixed(2),
        currency,
        cartSnapshot: JSON.stringify(cartItems.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          name: i.name,
          slug: i.slug,
          imageUrl: i.imageUrl,
          sku: i.sku,
          variantLabel: i.variantLabel,
          priceUsd: i.priceUsd,
          priceGbp: i.priceGbp,
        }))).substring(0, 500), // Stripe metadata 500 char limit per key
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: stripeAmount,
        currency: stripeCurrency,
        breakdown: {
          subtotalUsd, subtotalGbp,
          shippingUsd, shippingGbp,
          vatGbp, discountAmountUsd, discountAmountGbp,
          totalUsd, totalGbp,
        },
      },
    });
  } catch (err) {
    console.error('PaymentIntent error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create payment intent' }, { status: 500 });
  }
}
