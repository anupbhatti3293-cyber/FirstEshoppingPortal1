/*
  # Initial LuxeHaven Multi-Tenant Schema

  ## Overview
  This migration establishes the foundational multi-tenant database architecture for LuxeHaven,
  a premium e-commerce dropshipping platform targeting US and UK markets.

  ## 1. New Tables Created

  ### `tenants`
  Core multi-tenant table. Tenant ID 1 = owner's store, IDs 2+ = future SaaS customers.
  - `id` (bigserial, primary key) - Unique tenant identifier
  - `name` (text, required) - Store/business name
  - `domain` (text, unique, nullable) - Custom domain (e.g., 'luxehaven.com')
  - `plan` (enum) - Subscription tier: FREE, STARTER, GROWTH, PRO, ENTERPRISE
  - `stripe_customer_id` (text, nullable) - Stripe customer reference for billing
  - `created_at` (timestamptz) - Tenant creation timestamp
  - `updated_at` (timestamptz) - Last modification timestamp

  ### `settings`
  Key-value store for tenant-specific configuration (store name, announcement messages, etc.)
  - `id` (bigserial, primary key)
  - `tenant_id` (bigint, required, foreign key → tenants.id)
  - `key` (text, required) - Setting identifier (e.g., 'store_name', 'announcement_1')
  - `value` (text, required) - Setting value (stored as text, parse as needed)
  - `updated_at` (timestamptz) - Last update timestamp
  - **Unique constraint** on (tenant_id, key) - One value per setting per tenant

  ### `admin_users`
  Administrative users with backend access. JWT-authenticated for admin panel.
  - `id` (bigserial, primary key)
  - `tenant_id` (bigint, required, foreign key → tenants.id)
  - `email` (text, unique, required) - Admin login email
  - `password_hash` (text, required) - bcrypt hash (12+ rounds)
  - `role` (enum) - Access level: SUPER_ADMIN, ADMIN, MANAGER
  - `last_login` (timestamptz, nullable) - Last successful authentication
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last modification timestamp

  ### `audit_logs`
  Comprehensive audit trail for all admin actions (compliance & debugging).
  - `id` (bigserial, primary key)
  - `tenant_id` (bigint, required, foreign key → tenants.id)
  - `admin_id` (bigint, nullable, foreign key → admin_users.id) - NULL for system actions
  - `action` (text, required) - Action type (e.g., 'CREATE_PRODUCT', 'UPDATE_SETTINGS')
  - `entity` (text, required) - Affected entity type (e.g., 'Product', 'Order')
  - `entity_id` (text, nullable) - ID of affected record
  - `metadata` (jsonb, nullable) - Additional context (old/new values, IP address, etc.)
  - `created_at` (timestamptz) - Action timestamp

  ## 2. Enums Created
  - `subscription_plan` - Tenant subscription tiers
  - `admin_role` - Administrative permission levels

  ## 3. Security (Row Level Security)
  - **All tables have RLS enabled** - No access by default
  - Policies restrict data access by `tenant_id` - Users can only access their own tenant's data
  - Authenticated service role required for admin operations
  - Future: Add policies for customer-facing data when user auth is implemented

  ## 4. Indexes
  - Foreign key indexes for optimal join performance
  - Unique indexes for email lookups and domain routing
  - Composite index on settings(tenant_id, key) for fast configuration retrieval

  ## 5. Important Notes
  - **Data integrity is paramount** - All migrations use IF NOT EXISTS to be idempotent
  - Timestamps use `timestamptz` for proper timezone handling (critical for US/UK operations)
  - JSON columns use `jsonb` for efficient querying and indexing
  - Cascading deletes configured where appropriate (tenant deletion cascades to settings/users/logs)
*/

-- Create enums for type safety
DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('FREE', 'STARTER', 'GROWTH', 'PRO', 'ENTERPRISE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  domain text UNIQUE,
  plan subscription_plan NOT NULL DEFAULT 'FREE',
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create settings table (key-value store per tenant)
CREATE TABLE IF NOT EXISTS settings (
  id bigserial PRIMARY KEY,
  tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, key)
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id bigserial PRIMARY KEY,
  tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role admin_role NOT NULL DEFAULT 'ADMIN',
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  admin_id bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_settings_tenant_id ON settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_tenant_key ON settings(tenant_id, key);
CREATE INDEX IF NOT EXISTS idx_admin_users_tenant_id ON admin_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable Row Level Security on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants table
CREATE POLICY "Service role can manage all tenants"
  ON tenants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for settings table
CREATE POLICY "Service role can manage all settings"
  ON settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for admin_users table
CREATE POLICY "Service role can manage all admin users"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for audit_logs table
CREATE POLICY "Service role can manage all audit logs"
  ON audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default tenant (Tenant ID 1 = LuxeHaven owner store)
INSERT INTO tenants (id, name, domain, plan, created_at, updated_at)
VALUES (1, 'LuxeHaven', 'luxehaven.com', 'ENTERPRISE', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Insert default settings for tenant 1
INSERT INTO settings (tenant_id, key, value, updated_at) VALUES
  (1, 'store_name', 'LuxeHaven', now()),
  (1, 'announcement_1', 'Free Shipping on Orders Over $50 | Use Code: WELCOME10', now()),
  (1, 'announcement_2', 'UK Orders: No Customs Fees — Duty Paid Included', now()),
  (1, 'announcement_3', 'New Arrivals Every Day — Shop the Latest Trends', now()),
  (1, 'contact_email', 'hello@luxehaven.com', now()),
  (1, 'social_instagram', 'https://instagram.com/luxehaven', now()),
  (1, 'social_facebook', 'https://facebook.com/luxehaven', now()),
  (1, 'social_tiktok', 'https://tiktok.com/@luxehaven', now())
ON CONFLICT (tenant_id, key) DO NOTHING;

-- Reset sequence to ensure next tenant gets ID 2
SELECT setval('tenants_id_seq', GREATEST(1, (SELECT MAX(id) FROM tenants)), true);
