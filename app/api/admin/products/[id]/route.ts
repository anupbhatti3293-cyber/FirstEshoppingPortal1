import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdminRole } from '@/lib/adminGuard';
import { getTenantIdFromRequest } from '@/lib/tenant';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const admin = await requireAdminRole(request, ['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request) || admin.tenantId;
    const productId = parseInt(params.id);

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, product_images(*)')
      .eq('id', productId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const admin = await requireAdminRole(request, ['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request) || admin.tenantId;
    const productId = parseInt(params.id);
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

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .update({
        name,
        slug,
        category,
        short_description,
        description,
        base_price_usd,
        base_price_gbp,
        stock_quantity,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (productError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update product', message: productError.message },
        { status: 500 }
      );
    }

    if (image_url) {
      const { data: existingImages } = await supabaseAdmin
        .from('product_images')
        .select('id')
        .eq('product_id', productId)
        .eq('tenant_id', tenantId)
        .eq('position', 0);

      if (existingImages && existingImages.length > 0) {
        await supabaseAdmin
          .from('product_images')
          .update({ url: image_url, alt_text: name })
          .eq('id', existingImages[0].id);
      } else {
        await supabaseAdmin.from('product_images').insert({
          tenant_id: tenantId,
          product_id: productId,
          url: image_url,
          alt_text: name,
          position: 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update product',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const admin = await requireAdminRole(request, ['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantIdFromRequest(request) || admin.tenantId;
    const productId = parseInt(params.id);

    await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('product_id', productId)
      .eq('tenant_id', tenantId);

    const { error: productError } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('tenant_id', tenantId);

    if (productError) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete product', message: productError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete product',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
