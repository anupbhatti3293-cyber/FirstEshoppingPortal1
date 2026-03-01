/*
  # Authentication, User Accounts & Wishlist Schema

  ## Overview
  This migration creates the complete authentication and user management structure
  for LuxeHaven, including users, sessions, wishlists, and addresses.

  ## 1. New Tables Created

  ### `users`
  Customer account information.
  - `id` (uuid, primary key) - Unique user identifier
  - `tenant_id` (bigint, required) - Multi-tenant foreign key
  - `email` (text, unique, required) - User email address
  - `password_hash` (text, required) - Bcrypt hashed password
  - `first_name` (text) - User's first name
  - `last_name` (text) - User's last name
  - `phone` (text) - Contact phone number
  - `email_verified` (boolean) - Email verification status
  - `is_active` (boolean) - Account active status
  - `last_login_at` (timestamptz) - Last login timestamp
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `user_sessions`
  Active user sessions for authentication.
  - `id` (uuid, primary key) - Session identifier
  - `user_id` (uuid, required) - Foreign key to users
  - `token` (text, unique, required) - JWT token
  - `expires_at` (timestamptz, required) - Session expiration
  - `ip_address` (text) - Login IP address
  - `user_agent` (text) - Browser/device info
  - `created_at` (timestamptz)

  ### `user_addresses`
  Saved shipping/billing addresses.
  - `id` (uuid, primary key) - Address identifier
  - `tenant_id` (bigint, required) - Multi-tenant foreign key
  - `user_id` (uuid, required) - Foreign key to users
  - `type` (text, required) - 'shipping' or 'billing'
  - `is_default` (boolean) - Default address flag
  - `first_name` (text, required)
  - `last_name` (text, required)
  - `company` (text) - Optional company name
  - `address_line1` (text, required)
  - `address_line2` (text)
  - `city` (text, required)
  - `state_province` (text) - US state or UK county
  - `postal_code` (text, required)
  - `country` (text, required) - 'US' or 'GB'
  - `phone` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `wishlist_items`
  User saved products for later.
  - `id` (uuid, primary key)
  - `tenant_id` (bigint, required) - Multi-tenant foreign key
  - `user_id` (uuid, required) - Foreign key to users
  - `product_id` (bigint, required) - Foreign key to products
  - `added_at` (timestamptz) - When item was added
  - `notes` (text) - Optional user notes

  ## 2. Indexes for Performance
  - User email lookup index
  - Session token lookup index
  - Wishlist user and product indexes
  - Address user lookup index

  ## 3. Security (Row Level Security)
  - All tables have RLS enabled
  - Users can only access their own data
  - Authenticated users can manage their own wishlists and addresses
  - Admin service role has full access

  ## 4. Constraints
  - Email must be unique per tenant
  - Session tokens must be unique
  - Wishlist items must be unique per user/product combination
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  password_hash text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  email_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_tenant_unique UNIQUE (email, tenant_id)
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_addresses table
CREATE TABLE IF NOT EXISTS user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('shipping', 'billing')),
  is_default boolean NOT NULL DEFAULT false,
  first_name text NOT NULL,
  last_name text NOT NULL,
  company text,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state_province text,
  postal_code text NOT NULL,
  country text NOT NULL CHECK (country IN ('US', 'GB')),
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  CONSTRAINT wishlist_unique_user_product UNIQUE (user_id, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_tenant_id ON user_addresses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist_items(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_tenant_id ON wishlist_items(tenant_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = (current_setting('app.current_user_id', true))::uuid)
  WITH CHECK (id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Service role can manage all users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for user_sessions table
CREATE POLICY "Users can view own sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions
  FOR DELETE
  TO authenticated
  USING (user_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Service role can manage all sessions"
  ON user_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for user_addresses table
CREATE POLICY "Users can view own addresses"
  ON user_addresses
  FOR SELECT
  TO authenticated
  USING (user_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Users can insert own addresses"
  ON user_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Users can update own addresses"
  ON user_addresses
  FOR UPDATE
  TO authenticated
  USING (user_id = (current_setting('app.current_user_id', true))::uuid)
  WITH CHECK (user_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Users can delete own addresses"
  ON user_addresses
  FOR DELETE
  TO authenticated
  USING (user_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Service role can manage all addresses"
  ON user_addresses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for wishlist_items table
CREATE POLICY "Users can view own wishlist"
  ON wishlist_items
  FOR SELECT
  TO authenticated
  USING (user_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Users can insert own wishlist items"
  ON wishlist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Users can delete own wishlist items"
  ON wishlist_items
  FOR DELETE
  TO authenticated
  USING (user_id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Service role can manage all wishlist items"
  ON wishlist_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at'
  ) THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_addresses_updated_at'
  ) THEN
    CREATE TRIGGER update_addresses_updated_at
      BEFORE UPDATE ON user_addresses
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
