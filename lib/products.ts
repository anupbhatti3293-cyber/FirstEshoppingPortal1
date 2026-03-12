import { supabase } from './supabase';
import type { Product, ProductImage, ProductFilters, ProductListResponse, SearchResult, Currency } from '@/types';

/** Raw DB row shape returned by Supabase when product_images is joined */
interface ProductRow extends Omit<Product, 'images' | 'variants' | 'reviews'> {
  product_images?: ProductImage[];
  product_variants?: Product['variants'];
  product_reviews?: Product['reviews'];
}

export async function getProducts(
  filters: ProductFilters = {},
  tenantId: number = 1
): Promise<ProductListResponse> {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    rating,
    inStock,
    tags,
    sort = 'featured',
    page = 1,
    limit = 24,
    currency = 'USD',
  } = filters;

  let query = supabase
    .from('products')
    .select('*, product_images!inner(*)', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  if (category) {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search}}`);
  }

  const priceColumn = currency === 'USD' ? 'base_price_usd' : 'base_price_gbp';
  if (minPrice !== undefined) {
    query = query.gte(priceColumn, minPrice);
  }
  if (maxPrice !== undefined) {
    query = query.lte(priceColumn, maxPrice);
  }

  if (rating !== undefined) {
    query = query.gte('rating_average', rating);
  }

  if (inStock) {
    query = query.gt('stock_quantity', 0);
  }

  if (tags && tags.length > 0) {
    query = query.contains('tags', tags);
  }

  switch (sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'price-asc':
      query = query.order(priceColumn, { ascending: true });
      break;
    case 'price-desc':
      query = query.order(priceColumn, { ascending: false });
      break;
    case 'rating':
      query = query.order('rating_average', { ascending: false });
      break;
    case 'popular':
      query = query.order('sales_count', { ascending: false });
      break;
    case 'featured':
    default:
      query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
      break;
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    throw new Error('Failed to fetch products');
  }

  const productsWithImages = (data || []).map((product: ProductRow) => {
    const images = product.product_images ?? [];
    return {
      ...product,
      images: [...images].sort((a: ProductImage, b: ProductImage) => a.position - b.position),
    };
  });

  const totalPages = Math.ceil((count || 0) / limit);

  const facetsData = await getProductFacets(currency, tenantId);

  return {
    products: productsWithImages as Product[],
    total: count || 0,
    page,
    totalPages,
    facets: facetsData,
  };
}

export async function getProductBySlug(
  slug: string,
  tenantId: number = 1
): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_images (*),
      product_variants (*),
      product_reviews (*)
    `)
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  const images = ([...(data.product_images ?? [])]).sort(
    (a: ProductImage, b: ProductImage) => a.position - b.position
  );
  const variants = data.product_variants ?? [];
  const reviews = (data.product_reviews ?? []).filter(
    (r: NonNullable<Product['reviews']>[number]) => r.is_approved === true
  );

  return {
    ...data,
    images,
    variants,
    reviews,
  } as Product;
}

export async function searchProducts(
  query: string,
  limit: number = 5,
  currency: Currency = 'USD',
  tenantId: number = 1
): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      category,
      base_price_usd,
      base_price_gbp,
      product_images(url)
    `)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,short_description.ilike.%${query}%,category.ilike.%${query}%`)
    .limit(limit);

  if (error || !data) {
    console.error('Search error:', error);
    return [];
  }

  return data.map((product: { id: number; name: string; slug: string; category: string; base_price_usd: number; base_price_gbp: number; product_images?: { url: string }[] }) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    image: product.product_images?.[0]?.url ?? '',
    price_usd: product.base_price_usd,
    price_gbp: product.base_price_gbp,
  }));
}

export async function getRelatedProducts(
  productId: number,
  category: string,
  tenantId: number = 1,
  limit: number = 4
): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images!inner(*)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .eq('category', category)
    .neq('id', productId)
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((product: ProductRow) => ({
    ...product,
    images: [...(product.product_images ?? [])].sort(
      (a: ProductImage, b: ProductImage) => a.position - b.position
    ),
  })) as Product[];
}

async function getProductFacets(
  currency: Currency,
  tenantId: number
): Promise<ProductListResponse['facets']> {
  const { data, error } = await supabase.rpc('get_product_facets', {
    p_tenant_id: tenantId,
    p_currency: currency,
  });

  if (error || !data) {
    console.error('Error fetching facets:', error);
    return {
      categories: [],
      priceRange: { min: 0, max: currency === 'GBP' ? 400 : 500 },
      availableTags: [],
    };
  }

  return data as ProductListResponse['facets'];
}

export async function incrementProductViews(productId: number, tenantId: number = 1): Promise<void> {
  await supabase.rpc('increment_product_view_count', {
    p_tenant_id: tenantId,
    p_product_id: productId,
    p_increment: 1,
  });
}

export function formatPrice(price: number, currency: Currency): string {
  const symbol = currency === 'USD' ? '$' : '£';
  return `${symbol}${price.toFixed(2)}`;
}

export function getCategoryName(slug: string): string {
  const categories: Record<string, string> = {
    'jewellery': 'Jewellery',
    'clothing': 'Clothing',
    'purses-bags': 'Purses & Bags',
    'beauty': 'Beauty',
  };
  return categories[slug] || slug;
}

export function getCategoryDescription(slug: string): string {
  const descriptions: Record<string, string> = {
    'jewellery': 'Discover our exquisite collection of fine jewellery, from elegant necklaces to stunning earrings.',
    'clothing': 'Explore premium fashion pieces crafted with the finest materials for timeless style.',
    'purses-bags': 'Luxury handbags and purses designed to complement any outfit with sophistication.',
    'beauty': 'Premium beauty products and skincare essentials for radiant, healthy skin.',
  };
  return descriptions[slug] || '';
}
