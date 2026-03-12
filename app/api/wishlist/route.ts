import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSession } from '@/lib/auth';

// GET — fetch wishlist for current user
export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('wishlist_items')
    .select(`
      id,
      product_id,
      added_at,
      products (
        id, name, slug, base_price_usd, base_price_gbp,
        sale_price_usd, sale_price_gbp,
        rating_average, rating_count, stock_quantity,
        product_images (url, alt_text, is_primary, position)
      )
    `)
    .eq('user_id', session.user.id)
    .order('added_at', { ascending: false });

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

// POST — add product to wishlist
export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const { productId } = await request.json();
  if (!productId) return NextResponse.json({ success: false, error: 'productId required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('wishlist_items')
    .upsert({ user_id: session.user.id, product_id: productId, tenant_id: session.user.tenantId },
      { onConflict: 'user_id,product_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

// DELETE — remove product from wishlist
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');
  if (!productId) return NextResponse.json({ success: false, error: 'productId required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('wishlist_items')
    .delete()
    .eq('user_id', session.user.id)
    .eq('product_id', productId);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
