export type Currency = 'USD' | 'GBP';

export type Locale = 'en-US' | 'en-GB';

export interface LocaleData {
  currency: Currency;
  locale: Locale;
  currencySymbol: string;
  countryCode: string;
  spelling: 'US' | 'UK';
}

export interface Product {
  id: string;
  name: string;
  price: {
    usd: number;
    gbp: number;
  };
  image: string;
  rating: number;
  reviews: number;
  badge: string | null;
  category: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
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
