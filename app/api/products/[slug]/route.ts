import { NextRequest, NextResponse } from 'next/server';
import { getProductBySlug, getRelatedProducts, incrementProductViews } from '@/lib/products';
import { getTenantIdFromRequest } from '@/lib/tenant';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const product = await getProductBySlug(params.slug, tenantId);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }

    // Fire-and-forget — don't await so it never delays the response
    incrementProductViews(product.id, tenantId).catch((err) =>
      console.error('Failed to increment view count:', err)
    );

    const relatedProducts = await getRelatedProducts(product.id, product.category, tenantId);

    return NextResponse.json({
      success: true,
      data: {
        product,
        relatedProducts,
      },
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

