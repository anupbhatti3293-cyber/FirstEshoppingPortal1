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
  is_approved: boolean;
  helpful_count: number;
  created_at: string;
}

export type AutomationStatus =
  | 'PENDING_AI'
  | 'AI_PROCESSED'
  | 'LIVE'
  | 'PAUSED'
  | 'REJECTED';

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
  // AI-generated content (migration 005)
  ai_description: string | null;
  ai_short_description: string | null;
  ai_tags: string[];
  ai_seo_title: string | null;
  ai_seo_description: string | null;
  // Quality & automation (migration 005)
  quality_score: number;
  qa_badge: string | null;
  automation_status: AutomationStatus;
  // Supplier linkage (migration 005)
  supplier_id: number | null;
  supplier_product_id: number | null;
  cost_price_usd: number | null;
  cost_price_gbp: number | null;
  // Competitor pricing (migration 005)
  competitor_price_usd: number | null;
  competitor_price_gbp: number | null;
  // Sync timestamps (migration 005)
  last_ai_updated_at: string | null;
  last_price_synced_at: string | null;
  last_inventory_synced_at: string | null;
  // Relations
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

// ─────────────────────────────────────────────
// AI & SUPPLIER AUTOMATION TYPES (migration 005)
// ─────────────────────────────────────────────

export type SupplierPlatform =
  | 'CJDROPSHIPPING'
  | 'ALIEXPRESS_DSERS'
  | 'ZENDROP'
  | 'SPOCKET'
  | 'CUSTOM_API'
  | 'CSV_IMPORT';

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type JobType =
  | 'PRODUCT_SYNC'
  | 'PRICE_SYNC'
  | 'INVENTORY_SYNC'
  | 'AI_DESCRIPTION_REWRITE'
  | 'AI_SEO_OPTIMISE'
  | 'AI_QUALITY_SCORE'
  | 'COMPETITOR_PRICE_CHECK'
  | 'ORDER_FULFIL';

export interface SupplierIntegration {
  id: number;
  tenant_id: number;
  platform: SupplierPlatform;
  display_name: string;
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
  webhook_secret: string | null;
  base_url: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  last_synced_at: string | null;
  sync_interval_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierProduct {
  id: number;
  tenant_id: number;
  supplier_id: number;
  external_id: string;
  external_url: string | null;
  raw_title: string;
  raw_description: string | null;
  raw_images: { url: string; alt?: string }[];
  raw_variants: Record<string, unknown>[];
  supplier_price_usd: number | null;
  supplier_price_gbp: number | null;
  supplier_category: string | null;
  supplier_tags: string[];
  raw_rating: number | null;
  raw_review_count: number;
  shipping_days_us: number | null;
  shipping_days_uk: number | null;
  processing_status: AutomationStatus;
  linked_product_id: number | null;
  rejection_reason: string | null;
  fetched_at: string;
  processed_at: string | null;
}

export interface AiProductAnalysis {
  id: number;
  tenant_id: number;
  product_id: number | null;
  supplier_product_id: number | null;
  ai_model: string;
  ai_title: string | null;
  ai_description: string | null;
  ai_short_description: string | null;
  ai_tags: string[];
  ai_seo_title: string | null;
  ai_seo_description: string | null;
  ai_seo_keywords: string[];
  quality_score: number | null;
  image_quality_score: number | null;
  description_quality_score: number | null;
  review_sentiment_score: number | null;
  market_fit_score: number | null;
  is_qa_verified: boolean;
  is_engineer_verified: boolean;
  qa_badge_label: string | null;
  suitable_for_us: boolean;
  suitable_for_uk: boolean;
  uk_compliance_notes: string | null;
  us_compliance_notes: string | null;
  raw_ai_response: Record<string, unknown> | null;
  approved_by_admin_id: number | null;
  approved_at: string | null;
  created_at: string;
}

export interface CompetitorPrice {
  id: number;
  tenant_id: number;
  product_id: number | null;
  competitor_name: string;
  competitor_url: string | null;
  price_usd: number | null;
  price_gbp: number | null;
  currency: string;
  in_stock: boolean | null;
  captured_at: string;
}

export interface PriceRule {
  id: number;
  tenant_id: number;
  name: string;
  applies_to_category: string | null;
  applies_to_supplier_id: number | null;
  target_margin_pct: number;
  min_margin_pct: number;
  floor_price_usd: number | null;
  floor_price_gbp: number | null;
  ceiling_price_usd: number | null;
  ceiling_price_gbp: number | null;
  beat_competitor_by_pct: number | null;
  round_to_nearest: number;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationJob {
  id: number;
  tenant_id: number;
  job_type: JobType;
  status: JobStatus;
  supplier_id: number | null;
  product_id: number | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AutomationLog {
  id: number;
  tenant_id: number;
  job_id: number | null;
  level: 'INFO' | 'WARN' | 'ERROR';
  action: string;
  entity: string | null;
  entity_id: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Utility: compute selling price from cost + margin rule
export interface PriceCalculation {
  cost_usd: number;
  cost_gbp: number;
  selling_price_usd: number;
  selling_price_gbp: number;
  margin_pct: number;
  rule_applied: string;
}

// Admin dashboard extension
export interface AutomationDashboardMetrics {
  pending_ai_products: number;
  jobs_running: number;
  jobs_failed_24h: number;
  products_synced_today: number;
  last_sync_at: string | null;
}
