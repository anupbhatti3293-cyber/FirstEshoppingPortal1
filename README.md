# LuxeHaven — Premium E-Commerce Dropshipping Platform

A full-stack, production-ready e-commerce platform built with Next.js 14, TypeScript, and Supabase. Designed for scalability with multi-tenant architecture from Day 1.

## Features

### Customer-Facing
- **Homepage**: Hero carousel, category grid, trending products, AI stylist banner, trust signals, new arrivals, newsletter signup
- **Product Discovery**: Browse by category (Jewellery, Clothing, Purses & Bags, Beauty, Sale)
- **Multi-Currency**: Automatic USD/GBP switching based on user location
- **SEO Optimized**: Full metadata, JSON-LD structured data, XML sitemap, robots.txt
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: WCAG 2.1 AA compliant components

### Admin Panel
- **Dashboard**: Revenue metrics, order tracking, product management
- **Settings**: Configure store name, announcement messages, contact info, social links
- **Sidebar Navigation**: Dashboard, Products, Orders, Customers, Suppliers, StyleMate AI, Analytics, Settings
- **Secure Authentication**: JWT-based admin login (future implementation)

### Technical Foundation
- **Multi-Tenant Database**: PostgreSQL with Row Level Security (RLS)
- **Type-Safe**: Strict TypeScript throughout
- **Performance**: Server Components, image optimization, lazy loading
- **Security**: GDPR/CCPA compliant, PCI DSS ready (via Stripe), XSS/CSRF protection
- **Compliance**: Cookie consent, privacy policy, terms of service

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: PostgreSQL (Supabase-hosted)
- **ORM**: Direct Supabase client (Prisma-ready for future NestJS backend)
- **Fonts**: Playfair Display (headings) + Inter (body)
- **Icons**: Lucide React

## Project Structure

```
/app
  /(shop)              # Customer-facing routes
    /page.tsx          # Homepage
    /about/page.tsx    # About page
    /contact/page.tsx  # Contact form + FAQ
    /privacy/page.tsx  # Privacy policy
    /terms/page.tsx    # Terms of service
  /admin               # Admin panel routes
    /login/page.tsx    # Admin authentication
    /dashboard/page.tsx # Dashboard home
    /settings/page.tsx  # Store settings
  /layout.tsx          # Root layout (header, footer, announcement bar)
  /sitemap.ts          # XML sitemap generator
  /robots.ts           # Robots.txt configuration

/components
  /shop                # Customer-facing components
    /Header.tsx
    /Footer.tsx
    /AnnouncementBar.tsx
    /HeroCarousel.tsx
    /CategoryGrid.tsx
    /ProductCard.tsx
    /TrendingProducts.tsx
    /StyleMateAIBanner.tsx
    /TrustSignalsBar.tsx
    /NewArrivalsGrid.tsx
    /NewsletterSignup.tsx
    /CookieConsent.tsx
    /CurrencySelector.tsx
    /MobileMenu.tsx
  /admin               # Admin panel components
    /Sidebar.tsx
    /MetricCard.tsx
  /ui                  # shadcn/ui base components

/lib
  /constants.ts        # App-wide constants (categories, products, etc.)
  /supabase.ts         # Supabase client + helper functions
  /utils.ts            # Utility functions

/types
  /index.ts            # Global TypeScript types

/middleware.ts         # Geo-detection, locale/currency auto-setting
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://luxehaven.com
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (database already provisioned)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials (already provided)
```

3. Database is already set up with initial migration (tenants, settings, admin_users, audit_logs)

4. Run development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm run start
```

## Database Schema

### Multi-Tenant Architecture
Every table includes `tenant_id` for future SaaS expansion. Tenant ID 1 = LuxeHaven owner store.

**Tables:**
- `tenants` — Store/business records
- `settings` — Key-value configuration per tenant
- `admin_users` — Admin panel authentication
- `audit_logs` — Complete audit trail for compliance

**Security:**
- Row Level Security (RLS) enabled on all tables
- Service role policies for backend access
- No direct public access without authentication

## Design System

**Colors:**
- Primary: `#1E3A5F` (Deep Navy)
- Secondary: `#2E86AB` (Ocean Blue)
- Accent: `#F4A261` (Gold/Copper)
- Background: `#FAFAFA`
- Text: `#1A1A2E`

**Typography:**
- Headings: Playfair Display (serif)
- Body: Inter (sans-serif)

**Spacing:** 4px base unit system

**Radius:** sm=4px, md=8px, lg=12px, xl=16px

## Future Enhancements

This foundation is ready for:
- Product catalog management (CRUD)
- Shopping cart + checkout flow
- Stripe payment integration
- Customer authentication (NextAuth.js)
- StyleMate AI recommendation engine
- Order management system
- Supplier integration
- Email notifications
- Analytics dashboard
- Multi-language support

## License

Proprietary - All rights reserved by LuxeHaven

## Support

For questions or issues:
- Email: hello@luxehaven.com
- Admin: admin@luxehaven.com
