import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSession } from '@/lib/auth';
import { getTenantIdFromRequest } from '@/lib/tenant';
import type { CartLineItem } from '@/types';

// GET — fetch DB cart for logged-in user
export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('cart_items')
    .select(`
      id, product_id, variant_id, quantity,
      products (
        id, name, slug, base_price_usd, base_price_gbp,
        sale_price_usd, sale_price_gbp, stock_quantity,
        product_images (url, alt_text, is_primary, position)
      ),
      product_variants (id, label, sku, price_modifier_usd, price_modifier_gbp)
    `)
    .eq('user_id', session.user.id)
    .order('added_at', { ascending: true });

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  // Transform to CartLineItem format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: CartLineItem[] = (data || []).map((row: any) => {
    const p = row.products;
    const v = row.product_variants;
    const primaryImg = p?.product_images?.find((i: { is_primary: boolean }) => i.is_primary) || p?.product_images?.[0];
    const baseUsd = p?.sale_price_usd ?? p?.base_price_usd ?? 0;
    const baseGbp = p?.sale_price_gbp ?? p?.base_price_gbp ?? 0;
    return {
      productId: row.product_id,
      variantId: row.variant_id,
      quantity: row.quantity,
      name: p?.name ?? '',
      slug: p?.slug ?? '',
      imageUrl: primaryImg?.url ?? null,
      sku: v?.sku ?? '',
      variantLabel: v?.label ?? null,
      priceUsd: baseUsd + (v?.price_modifier_usd ?? 0),
      priceGbp: baseGbp + (v?.price_modifier_gbp ?? 0),
      stockQuantity: p?.stock_quantity ?? 0,
    };
  });

  return NextResponse.json({ success: true, data: items });
}

// POST — add item to DB cart
export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const { productId, variantId, quantity = 1 } = await request.json();
  if (!productId) return NextResponse.json({ success: false, error: 'productId required' }, { status: 400 });

  const tenantId = getTenantIdFromRequest(request);

  // Check stock
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('stock_quantity, allow_backorder')
    .eq('id', productId)
    .single();

  if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  if (!product.allow_backorder && product.stock_quantity < quantity) {
    return NextResponse.json({ success: false, error: 'Insufficient stock' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('cart_items')
    .upsert(
      { user_id: session.user.id, product_id: productId, variant_id: variantId ?? null, quantity, tenant_id: tenantId },
      { onConflict: 'user_id,product_id,variant_id', ignoreDuplicates: false }
    );

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH — update quantity
export async function PATCH(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const { productId, variantId, quantity } = await request.json();

  if (quantity <= 0) {
    await supabaseAdmin.from('cart_items')
      .delete()
      .eq('user_id', session.user.id)
      .eq('product_id', productId)
      .is('variant_id', variantId ?? null);
    return NextResponse.json({ success: true });
  }

  const { error } = await supabaseAdmin
    .from('cart_items')
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
    .eq('product_id', productId)
    .is('variant_id', variantId ?? null);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE — remove item or clear entire cart
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');

  if (productId) {
    const variantId = searchParams.get('variantId');
    let query = supabaseAdmin.from('cart_items').delete()
      .eq('user_id', session.user.id)
      .eq('product_id', productId);
    if (variantId) query = query.eq('variant_id', variantId);
    else query = query.is('variant_id', null);
    const { error } = await query;
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } else {
    // Clear entire cart
    const { error } = await supabaseAdmin.from('cart_items').delete().eq('user_id', session.user.id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
