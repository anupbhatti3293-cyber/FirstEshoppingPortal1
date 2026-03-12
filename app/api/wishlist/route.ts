import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { getTenantIdFromRequest } from '@/lib/tenant';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const session = await getSession(token);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('wishlist_items')
      .select(`
        id,
        product_id,
        added_at,
        notes,
        products (
          id,
          name,
          slug,
          short_description,
          category,
          base_price_usd,
          base_price_gbp,
          stock_quantity,
          is_active,
          product_images (url, alt_text)
        )
      `)
      .eq('user_id', session.user.id)
      .eq('tenant_id', tenantId)
      .order('added_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wishlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('Wishlist fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch wishlist',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const session = await getSession(token);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const { data: existingItem } = await supabaseAdmin
      .from('wishlist_items')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existingItem) {
      return NextResponse.json(
        { success: false, error: 'Product already in wishlist' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('wishlist_items')
      .insert({
        tenant_id: tenantId,
        user_id: session.user.id,
        product_id: productId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to add to wishlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Added to wishlist',
    });
  } catch (error) {
    console.error('Wishlist add error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add to wishlist',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
