export type Currency = 'USD' | 'GBP';

export type Locale = 'en-US' | 'en-GB';

export interface LocaleData {
  currency: Currency;
  locale: Locale;
  currencySymbol: string;
  countryCode: string;
  spelling: 'US' | 'UK';
}

export interface ProductImage {
  id: number;
  url: string;
  alt_text: string | null;
  position: number;
  width: number | null;
  height: number | null;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  name: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  price_adjustment_usd: number;
  price_adjustment_gbp: number;
  stock_quantity: number;
  is_active: boolean;
}

export interface ProductReview {
  id: number;
  product_id: number;
  customer_email: string;
  customer_name: string;
  rating: number;
  title: string | null;
  content: string | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
}

export interface Product {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  category: string;
  sku: string;
  base_price_usd: number;
  base_price_gbp: number;
  sale_price_usd: number | null;
  sale_price_gbp: number | null;
  compare_at_price_usd: number | null;
  compare_at_price_gbp: number | null;
  is_active: boolean;
  is_featured: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  allow_backorder: boolean;
  weight_grams: number | null;
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  rating_average: number;
  rating_count: number;
  view_count: number;
  sales_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  images?: ProductImage[];
  variants?: ProductVariant[];
  reviews?: ProductReview[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  description?: string;
  productCount?: number;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  tags?: string[];
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popular' | 'featured';
  page?: number;
  limit?: number;
  currency?: Currency;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
  facets: {
    categories: { name: string; slug: string; count: number }[];
    priceRange: { min: number; max: number };
    availableTags: string[];
  };
}

export interface SearchResult {
  id: number;
  name: string;
  slug: string;
  image: string;
  price_usd: number;
  price_gbp: number;
  category: string;
}

export interface HeroSlide {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  primaryCta: {
    text: string;
    href: string;
  };
  secondaryCta: {
    text: string;
    href: string;
  };
}

export interface TrustSignal {
  icon: string;
  title: string;
  description: string;
}

export interface NavLink {
  name: string;
  href: string;
}

export interface SocialLink {
  name: string;
  href: string;
  icon: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Setting {
  id: number;
  tenantId: number;
  key: string;
  value: string;
  updatedAt: string;
}

export interface Tenant {
  id: number;
  name: string;
  domain: string | null;
  plan: 'FREE' | 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: number;
  tenantId: number;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: number;
  tenantId: number;
  adminId: number | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  ordersToday: number;
  totalProducts: number;
  totalCustomers: number;
}
