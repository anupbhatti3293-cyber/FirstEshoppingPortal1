/*
  # Cart, Orders & Checkout Schema — Migration 006

  ## Tables Created
  1. cart_items              — persistent cart for logged-in users
  2. cart_reservations       — 15-min inventory holds during checkout
  3. checkout_sessions       — tracks checkout progress for abandonment recovery
  4. discount_codes          — coupon/promo code engine
  5. discount_redemptions    — audit trail of every code use
  6. orders                  — master order record
  7. order_items             — line items with product snapshot
  8. order_status_history    — full status change audit trail

  ## Design Rules (consistent with migrations 001–005)
  - Every table has tenant_id
  - RLS enabled on all tables
  - service_role policies only
  - Proper indexes for all foreign keys + query patterns
*/

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'PENDING_PAYMENT',
    'PROCESSING',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
    'PARTIALLY_REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM (
    'PERCENTAGE',
    'FIXED_AMOUNT',
    'FREE_SHIPPING'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE shipping_method AS ENUM (
    'STANDARD',
    'EXPRESS'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─────────────────────────────────────────────
-- 1. CART ITEMS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cart_items (
  id                bigserial PRIMARY KEY,
  tenant_id         bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id        bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id        bigint REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity          integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at          timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, variant_id)
);

-- ─────────────────────────────────────────────
-- 2. CART RESERVATIONS (15-min inventory hold)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cart_reservations (
  id                bigserial PRIMARY KEY,
  tenant_id         bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_token     uuid NOT NULL,
  product_id        bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id        bigint REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity          integer NOT NULL,
  reserved_until    timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 3. CHECKOUT SESSIONS (abandonment tracking)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id                          bigserial PRIMARY KEY,
  tenant_id                   bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id                     bigint REFERENCES users(id) ON DELETE SET NULL,
  email                       text NOT NULL,
  session_token               uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  cart_snapshot               jsonb NOT NULL DEFAULT '[]',
  step_reached                integer NOT NULL DEFAULT 1,
  -- Abandonment recovery
  abandoned_email_1_sent_at   timestamptz,
  abandoned_email_2_sent_at   timestamptz,
  recovered_at                timestamptz,
  -- Unsubscribe (GDPR + CAN-SPAM)
  unsubscribed_at             timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 4. DISCOUNT CODES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS discount_codes (
  id                  bigserial PRIMARY KEY,
  tenant_id           bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code                text NOT NULL,
  discount_type       discount_type NOT NULL DEFAULT 'PERCENTAGE',
  value               decimal(10,2) NOT NULL,          -- % or fixed amount
  min_order_usd       decimal(10,2),                   -- minimum order in USD
  min_order_gbp       decimal(10,2),                   -- minimum order in GBP
  max_uses            integer,                         -- NULL = unlimited
  uses_count          integer NOT NULL DEFAULT 0,
  per_customer_limit  integer NOT NULL DEFAULT 1,
  starts_at           timestamptz,
  expires_at          timestamptz,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- ─────────────────────────────────────────────
-- 5. DISCOUNT REDEMPTIONS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS discount_redemptions (
  id                  bigserial PRIMARY KEY,
  tenant_id           bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  discount_code_id    bigint NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  order_id            bigint,                          -- set after order created
  user_id             bigint REFERENCES users(id) ON DELETE SET NULL,
  guest_email         text,
  amount_saved_usd    decimal(10,2),
  amount_saved_gbp    decimal(10,2),
  redeemed_at         timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 6. ORDERS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
  id                          bigserial PRIMARY KEY,
  tenant_id                   bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number                text NOT NULL,           -- e.g. LH-2026-0001
  order_token                 uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE, -- public tracking token
  user_id                     bigint REFERENCES users(id) ON DELETE SET NULL,
  guest_email                 text,                    -- for guest checkout
  status                      order_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  currency                    text NOT NULL DEFAULT 'USD',
  -- Pricing (always stored in both currencies)
  subtotal_usd                decimal(10,2) NOT NULL,
  subtotal_gbp                decimal(10,2) NOT NULL,
  shipping_cost_usd           decimal(10,2) NOT NULL DEFAULT 0,
  shipping_cost_gbp           decimal(10,2) NOT NULL DEFAULT 0,
  vat_amount_usd              decimal(10,2) NOT NULL DEFAULT 0,
  vat_amount_gbp              decimal(10,2) NOT NULL DEFAULT 0,
  discount_amount_usd         decimal(10,2) NOT NULL DEFAULT 0,
  discount_amount_gbp         decimal(10,2) NOT NULL DEFAULT 0,
  total_usd                   decimal(10,2) NOT NULL,
  total_gbp                   decimal(10,2) NOT NULL,
  -- Discount
  discount_code_id            bigint REFERENCES discount_codes(id) ON DELETE SET NULL,
  -- Shipping
  shipping_method             shipping_method NOT NULL DEFAULT 'STANDARD',
  shipping_address            jsonb NOT NULL,          -- snapshot at time of order
  -- Payment
  stripe_payment_intent_id    text UNIQUE,             -- idempotency key
  stripe_charge_id            text,
  payment_method_last4        text,
  payment_method_brand        text,
  -- Fulfilment
  tracking_number             text,
  tracking_carrier            text,
  estimated_delivery_date     date,
  -- Refund
  refund_amount_usd           decimal(10,2),
  refund_amount_gbp           decimal(10,2),
  refund_reason               text,
  refunded_at                 timestamptz,
  -- Notes
  notes                       text,                   -- gift message / order notes
  -- Checkout session link
  checkout_session_id         bigint REFERENCES checkout_sessions(id) ON DELETE SET NULL,
  -- Timestamps
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, order_number)
);

-- ─────────────────────────────────────────────
-- 7. ORDER ITEMS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_items (
  id                  bigserial PRIMARY KEY,
  tenant_id           bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id            bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id          bigint REFERENCES products(id) ON DELETE SET NULL,
  variant_id          bigint REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity            integer NOT NULL,
  unit_price_usd      decimal(10,2) NOT NULL,
  unit_price_gbp      decimal(10,2) NOT NULL,
  total_price_usd     decimal(10,2) NOT NULL,
  total_price_gbp     decimal(10,2) NOT NULL,
  -- Snapshot at time of purchase (immutable — never update these)
  product_snapshot    jsonb NOT NULL  -- { name, slug, image_url, sku, variant_label }
);

-- ─────────────────────────────────────────────
-- 8. ORDER STATUS HISTORY
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_status_history (
  id              bigserial PRIMARY KEY,
  tenant_id       bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id        bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status     order_status,
  to_status       order_status NOT NULL,
  admin_id        bigint REFERENCES admin_users(id) ON DELETE SET NULL,
  note            text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- ORDER NUMBER SEQUENCE + GENERATOR FUNCTION
-- ─────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number(p_tenant_id bigint)
RETURNS text AS $$
DECLARE
  v_year text;
  v_seq  text;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_seq  := lpad(nextval('order_number_seq')::text, 4, '0');
  RETURN 'LH-' || v_year || '-' || v_seq;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cart_items_user        ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_tenant      ON cart_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product     ON cart_items(product_id);

CREATE INDEX IF NOT EXISTS idx_cart_reservations_token   ON cart_reservations(session_token);
CREATE INDEX IF NOT EXISTS idx_cart_reservations_expires ON cart_reservations(reserved_until);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_token   ON checkout_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_email   ON checkout_sessions(email);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_tenant  ON checkout_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_abandoned ON checkout_sessions(step_reached, recovered_at, abandoned_email_1_sent_at);

CREATE INDEX IF NOT EXISTS idx_discount_codes_tenant  ON discount_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code    ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active  ON discount_codes(is_active);

CREATE INDEX IF NOT EXISTS idx_discount_redemptions_code  ON discount_redemptions(discount_code_id);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_order ON discount_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_user  ON discount_redemptions(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_tenant          ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_user            ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number          ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_token           ON orders(order_token);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_pi       ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_created         ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order      ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product    ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

ALTER TABLE cart_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_reservations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_role_cart_items"           ON cart_items           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_cart_reservations"    ON cart_reservations    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_checkout_sessions"    ON checkout_sessions    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_discount_codes"       ON discount_codes       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_discount_redemptions" ON discount_redemptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_orders"               ON orders               FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_order_items"          ON order_items          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_order_status_history" ON order_status_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cart_items_updated_at') THEN
    CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_checkout_sessions_updated_at') THEN
    CREATE TRIGGER update_checkout_sessions_updated_at BEFORE UPDATE ON checkout_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at') THEN
    CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_discount_codes_updated_at') THEN
    CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON discount_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- SEED: Welcome discount code for tenant 1
-- ─────────────────────────────────────────────

INSERT INTO discount_codes (tenant_id, code, discount_type, value, per_customer_limit, is_active)
VALUES (1, 'WELCOME10', 'PERCENTAGE', 10, 1, true)
ON CONFLICT (tenant_id, code) DO NOTHING;
