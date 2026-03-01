import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TENANT_ID = 1;

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch products', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      name,
      slug,
      category,
      short_description,
      description,
      base_price_usd,
      base_price_gbp,
      stock_quantity,
      is_active,
      image_url,
    } = body;

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        tenant_id: TENANT_ID,
        name,
        slug,
        category,
        short_description,
        description,
        base_price_usd,
        base_price_gbp,
        stock_quantity,
        is_active,
        is_featured: false,
        rating_average: 0,
        rating_count: 0,
        sales_count: 0,
        tags: [],
      })
      .select()
      .single();

    if (productError) {
      return NextResponse.json(
        { success: false, error: 'Failed to create product', message: productError.message },
        { status: 500 }
      );
    }

    if (image_url && product) {
      await supabase.from('product_images').insert({
        product_id: product.id,
        url: image_url,
        alt_text: name,
        position: 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product created successfully',
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create product',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
