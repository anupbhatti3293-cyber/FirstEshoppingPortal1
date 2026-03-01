import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@/lib/products';
import type { Currency } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 5;
    const currency = (searchParams.get('currency') as Currency) || 'USD';

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const results = await searchProducts(query, limit, currency);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search products',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
