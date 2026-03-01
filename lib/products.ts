import { supabase } from './supabase';
import type { Product, ProductFilters, ProductListResponse, SearchResult, Currency } from '@/types';

const TENANT_ID = 1;

export async function getProducts(filters: ProductFilters = {}): Promise<ProductListResponse> {
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
    .eq('tenant_id', TENANT_ID)
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

  const productsWithImages = (data || []).map((product: any) => {
    const images = product.product_images || [];
    return {
      ...product,
      images: images.sort((a: any, b: any) => a.position - b.position),
    };
  });

  const totalPages = Math.ceil((count || 0) / limit);

  const facetsData = await getProductFacets(currency);

  return {
    products: productsWithImages as Product[],
    total: count || 0,
    page,
    totalPages,
    facets: facetsData,
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_images (*),
      product_variants (*),
      product_reviews (*)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  const images = (data.product_images || []).sort((a: any, b: any) => a.position - b.position);
  const variants = data.product_variants || [];
  const reviews = (data.product_reviews || []).filter((r: any) => r.is_approved);

  return {
    ...data,
    images,
    variants,
    reviews,
  } as Product;
}

export async function searchProducts(query: string, limit: number = 5, currency: Currency = 'USD'): Promise<SearchResult[]> {
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
    .eq('tenant_id', TENANT_ID)
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,short_description.ilike.%${query}%,category.ilike.%${query}%`)
    .limit(limit);

  if (error || !data) {
    console.error('Search error:', error);
    return [];
  }

  return data.map((product: any) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    image: product.product_images?.[0]?.url || '',
    price_usd: product.base_price_usd,
    price_gbp: product.base_price_gbp,
  }));
}

export async function getRelatedProducts(productId: number, category: string, limit: number = 4): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images!inner(*)')
    .eq('tenant_id', TENANT_ID)
    .eq('is_active', true)
    .eq('category', category)
    .neq('id', productId)
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((product: any) => ({
    ...product,
    images: (product.product_images || []).sort((a: any, b: any) => a.position - b.position),
  })) as Product[];
}

async function getProductFacets(currency: Currency): Promise<ProductListResponse['facets']> {
  const { data: allProducts } = await supabase
    .from('products')
    .select('category, base_price_usd, base_price_gbp, tags')
    .eq('tenant_id', TENANT_ID)
    .eq('is_active', true);

  const categories = [
    { name: 'Jewellery', slug: 'jewellery' },
    { name: 'Clothing', slug: 'clothing' },
    { name: 'Purses & Bags', slug: 'purses-bags' },
    { name: 'Beauty', slug: 'beauty' },
  ];

  const categoriesWithCount = categories.map((cat) => ({
    ...cat,
    count: (allProducts || []).filter((p: any) => p.category === cat.slug).length,
  }));

  const priceColumn = currency === 'USD' ? 'base_price_usd' : 'base_price_gbp';
  const prices = (allProducts || []).map((p: any) => p[priceColumn]);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 500;

  const allTags = new Set<string>();
  (allProducts || []).forEach((p: any) => {
    if (p.tags && Array.isArray(p.tags)) {
      p.tags.forEach((tag: string) => {
        if (tag) allTags.add(tag);
      });
    }
  });

  return {
    categories: categoriesWithCount,
    priceRange: { min: minPrice, max: maxPrice },
    availableTags: Array.from(allTags),
  };
}

export async function incrementProductViews(productId: number): Promise<void> {
  await supabase.rpc('increment', {
    row_id: productId,
    x: 1,
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
