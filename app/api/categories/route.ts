import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTenantIdFromRequest } from '@/lib/tenant';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const { data: products, error } = await supabase
      .from('products')
      .select('category')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    const categories = [
      {
        id: '1',
        name: 'Jewellery',
        slug: 'jewellery',
        description: 'Discover our exquisite collection of fine jewellery',
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&h=400',
      },
      {
        id: '2',
        name: 'Clothing',
        slug: 'clothing',
        description: 'Premium fashion pieces crafted with the finest materials',
        image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=400',
      },
      {
        id: '3',
        name: 'Purses & Bags',
        slug: 'purses-bags',
        description: 'Luxury handbags and purses for sophisticated style',
        image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600&h=400',
      },
      {
        id: '4',
        name: 'Beauty',
        slug: 'beauty',
        description: 'Premium beauty products and skincare essentials',
        image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=400',
      },
    ];

    const categoriesWithCount = categories.map((cat) => ({
      ...cat,
      productCount: (products || []).filter((p: any) => p.category === cat.slug).length,
    }));

    return NextResponse.json({
      success: true,
      data: categoriesWithCount,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch categories',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
