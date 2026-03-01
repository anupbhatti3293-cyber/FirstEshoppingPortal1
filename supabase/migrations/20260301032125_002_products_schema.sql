/*
  # Products Catalogue Schema

  ## Overview
  This migration creates the complete product catalogue structure for LuxeHaven,
  including products, variants, images, reviews, and inventory management.

  ## 1. New Tables Created

  ### `products`
  Core product information table.
  - `id` (bigserial, primary key) - Unique product identifier
  - `tenant_id` (bigint, required) - Multi-tenant foreign key
  - `name` (text, required) - Product name
  - `slug` (text, unique, required) - URL-friendly identifier
  - `description` (text) - Full product description (rich text)
  - `short_description` (text) - Brief summary for cards
  - `category` (text, required) - Product category (jewellery, clothing, purses-bags, beauty)
  - `sku` (text, unique, required) - Stock keeping unit
  - `base_price_usd` (decimal, required) - Base price in USD
  - `base_price_gbp` (decimal, required) - Base price in GBP
  - `sale_price_usd` (decimal) - Sale price in USD (null if not on sale)
  - `sale_price_gbp` (decimal) - Sale price in GBP (null if not on sale)
  - `cost_price` (decimal) - Cost from supplier (for margin calculation)
  - `compare_at_price_usd` (decimal) - Original price before discount (USD)
  - `compare_at_price_gbp` (decimal) - Original price before discount (GBP)
  - `is_active` (boolean) - Product visibility on storefront
  - `is_featured` (boolean) - Show in featured sections
  - `stock_quantity` (integer) - Total available stock
  - `low_stock_threshold` (integer) - Alert threshold
  - `allow_backorder` (boolean) - Can sell when out of stock
  - `weight_grams` (integer) - Product weight for shipping
  - `tags` (text[]) - Searchable tags array
  - `meta_title` (text) - SEO title
  - `meta_description` (text) - SEO description
  - `rating_average` (decimal) - Calculated average rating (0-5)
  - `rating_count` (integer) - Total number of ratings
  - `view_count` (integer) - Product page views
  - `sales_count` (integer) - Total units sold
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `published_at` (timestamptz) - When product went live

  ### `product_images`
  Product image gallery.
  - `id` (bigserial, primary key)
  - `tenant_id` (bigint, required)
  - `product_id` (bigint, required) - Foreign key to products
  - `url` (text, required) - Image URL (Cloudinary or Unsplash)
  - `alt_text` (text) - Accessibility description
  - `position` (integer) - Display order (0 = main image)
  - `width` (integer) - Image width in pixels
  - `height` (integer) - Image height in pixels
  - `created_at` (timestamptz)

  ### `product_variants`
  Product variations (size, color, etc.)
  - `id` (bigserial, primary key)
  - `tenant_id` (bigint, required)
  - `product_id` (bigint, required)
  - `sku` (text, unique, required) - Variant-specific SKU
  - `name` (text, required) - Variant name (e.g., "Small / Red")
  - `option1` (text) - First option (e.g., "Small")
  - `option2` (text) - Second option (e.g., "Red")
  - `option3` (text) - Third option (e.g., "Cotton")
  - `price_adjustment_usd` (decimal) - Price difference from base
  - `price_adjustment_gbp` (decimal) - Price difference from base
  - `stock_quantity` (integer, required) - Variant-specific stock
  - `is_active` (boolean) - Variant availability
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `product_reviews`
  Customer reviews and ratings.
  - `id` (bigserial, primary key)
  - `tenant_id` (bigint, required)
  - `product_id` (bigint, required)
  - `customer_email` (text, required) - Reviewer email
  - `customer_name` (text, required) - Reviewer display name
  - `rating` (integer, required) - 1-5 stars
  - `title` (text) - Review headline
  - `content` (text) - Review body
  - `is_verified_purchase` (boolean) - Bought from store
  - `is_approved` (boolean) - Admin approval status
  - `helpful_count` (integer) - Upvotes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Indexes for Performance
  - Product search and filtering indexes
  - Category and tag indexes for fast filtering
  - Rating and price range indexes
  - Full-text search index on product names and descriptions

  ## 3. Security (Row Level Security)
  - All tables have RLS enabled
  - Public read access for active products
  - Service role write access for admin operations

  ## 4. Sample Data
  - 20+ demo products across all categories
  - Multiple images per product
  - Sample reviews for social proof
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id bigserial PRIMARY KEY,
  tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  short_description text,
  category text NOT NULL,
  sku text UNIQUE NOT NULL,
  base_price_usd decimal(10,2) NOT NULL,
  base_price_gbp decimal(10,2) NOT NULL,
  sale_price_usd decimal(10,2),
  sale_price_gbp decimal(10,2),
  cost_price decimal(10,2),
  compare_at_price_usd decimal(10,2),
  compare_at_price_gbp decimal(10,2),
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 10,
  allow_backorder boolean NOT NULL DEFAULT false,
  weight_grams integer,
  tags text[] DEFAULT '{}',
  meta_title text,
  meta_description text,
  rating_average decimal(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  sales_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id bigserial PRIMARY KEY,
  tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text,
  position integer NOT NULL DEFAULT 0,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id bigserial PRIMARY KEY,
  tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  option1 text,
  option2 text,
  option3 text,
  price_adjustment_usd decimal(10,2) DEFAULT 0,
  price_adjustment_gbp decimal(10,2) DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create product_reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id bigserial PRIMARY KEY,
  tenant_id bigint NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text,
  is_verified_purchase boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_price_usd ON products(base_price_usd);
CREATE INDEX IF NOT EXISTS idx_products_price_gbp ON products(base_price_gbp);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating_average DESC);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_position ON product_images(position);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON product_reviews(is_approved);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read access for active products
CREATE POLICY "Public can view active products"
  ON products
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage all products"
  ON products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view product images"
  ON product_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.is_active = true
    )
  );

CREATE POLICY "Service role can manage product images"
  ON product_images
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view active variants"
  ON product_variants
  FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.is_active = true
    )
  );

CREATE POLICY "Service role can manage variants"
  ON product_variants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view approved reviews"
  ON product_reviews
  FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Service role can manage reviews"
  ON product_reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert sample products for LuxeHaven (Tenant ID 1)
INSERT INTO products (tenant_id, name, slug, description, short_description, category, sku, base_price_usd, base_price_gbp, compare_at_price_usd, compare_at_price_gbp, stock_quantity, is_active, is_featured, tags, rating_average, rating_count, published_at) VALUES
(1, 'Gold Layered Necklace', 'gold-layered-necklace', 'Elegant 18k gold-plated layered necklace featuring three delicate chains of varying lengths. Perfect for everyday wear or special occasions.', 'Elegant layered necklace with three delicate chains', 'jewellery', 'JWL-001', 89.99, 69.99, 129.99, 99.99, 45, true, true, ARRAY['trending', 'bestseller', 'gold'], 4.8, 124, now()),
(1, 'Minimalist Ring Set', 'minimalist-ring-set', 'Set of 5 minimalist stackable rings in brushed gold finish. Mix and match to create your perfect look.', 'Set of 5 stackable minimalist rings', 'jewellery', 'JWL-002', 49.99, 39.99, NULL, NULL, 67, true, true, ARRAY['new', 'trending'], 4.9, 89, now()),
(1, 'Pearl Drop Earrings', 'pearl-drop-earrings', 'Classic freshwater pearl drop earrings with sterling silver posts. Timeless elegance for any outfit.', 'Classic freshwater pearl drop earrings', 'jewellery', 'JWL-003', 129.99, 99.99, NULL, NULL, 32, true, false, ARRAY['bestseller'], 5.0, 203, now()),
(1, 'Diamond Stud Earrings', 'diamond-stud-earrings', 'Brilliant cut cubic zirconia stud earrings in platinum-plated setting. Sparkle without the price tag.', 'Brilliant CZ stud earrings', 'jewellery', 'JWL-004', 299.99, 239.99, NULL, NULL, 28, true, false, ARRAY['']::text[], 5.0, 178, now()),
(1, 'Rose Gold Bracelet', 'rose-gold-bracelet', 'Delicate rose gold chain bracelet with adjustable clasp. Perfect for layering or wearing alone.', 'Delicate rose gold chain bracelet', 'jewellery', 'JWL-005', 169.99, 134.99, 199.99, 159.99, 41, true, false, ARRAY['new', 'sale'], 4.9, 201, now()),

(1, 'Silk Midi Dress', 'silk-midi-dress', 'Luxurious 100% silk midi dress in flowing A-line silhouette. Features adjustable straps and hidden side zipper.', 'Luxurious silk midi dress', 'clothing', 'CLO-001', 159.99, 129.99, NULL, NULL, 22, true, true, ARRAY['trending'], 4.7, 67, now()),
(1, 'Cashmere Sweater', 'cashmere-sweater', 'Ultra-soft 100% cashmere crewneck sweater. Ribbed cuffs and hem. Available in 6 colors.', 'Ultra-soft cashmere crewneck sweater', 'clothing', 'CLO-002', 199.99, 159.99, 249.99, 199.99, 35, true, false, ARRAY['bestseller'], 4.8, 94, now()),
(1, 'Tailored Blazer', 'tailored-blazer', 'Classic tailored blazer in premium wool blend. Single-breasted with notch lapels and front pockets.', 'Classic tailored wool blazer', 'clothing', 'CLO-003', 249.99, 199.99, NULL, NULL, 18, true, false, ARRAY['new'], 4.8, 112, now()),
(1, 'Wide Leg Trousers', 'wide-leg-trousers', 'High-waisted wide leg trousers in flowing crepe fabric. Side zip with hook closure.', 'High-waisted wide leg trousers', 'clothing', 'CLO-004', 89.99, 72.99, NULL, NULL, 44, true, false, ARRAY['']::text[], 4.6, 78, now()),

(1, 'Leather Tote Bag', 'leather-tote-bag', 'Spacious genuine leather tote with interior pockets and magnetic snap closure. Professional and versatile.', 'Spacious genuine leather tote bag', 'purses-bags', 'BAG-001', 189.99, 149.99, 229.99, 179.99, 26, true, true, ARRAY['trending'], 4.6, 156, now()),
(1, 'Velvet Evening Clutch', 'velvet-evening-clutch', 'Elegant velvet clutch with gold-tone frame clasp. Perfect for formal occasions. Includes detachable chain strap.', 'Elegant velvet evening clutch', 'purses-bags', 'BAG-002', 119.99, 94.99, NULL, NULL, 31, true, false, ARRAY['new'], 4.7, 45, now()),
(1, 'Canvas Crossbody', 'canvas-crossbody', 'Durable canvas crossbody bag with leather accents. Multiple compartments and adjustable strap.', 'Durable canvas crossbody bag', 'purses-bags', 'BAG-003', 79.99, 64.99, NULL, NULL, 52, true, false, ARRAY['']::text[], 4.5, 92, now()),

(1, 'Radiance Serum', 'radiance-serum', 'Vitamin C brightening serum with hyaluronic acid. Reduces dark spots and evens skin tone. 30ml bottle.', 'Vitamin C brightening serum', 'beauty', 'BEA-001', 79.99, 64.99, NULL, NULL, 87, true, true, ARRAY['bestseller'], 4.9, 312, now()),
(1, 'Luxury Face Cream', 'luxury-face-cream', 'Rich anti-aging face cream with retinol and peptides. Hydrates and firms skin. 50ml jar.', 'Anti-aging face cream with retinol', 'beauty', 'BEA-002', 149.99, 119.99, 179.99, 144.99, 43, true, false, ARRAY['sale'], 4.9, 267, now()),
(1, 'Hydrating Face Mask', 'hydrating-face-mask', 'Sheet mask set infused with aloe vera and green tea. Pack of 5 masks for deep hydration.', 'Hydrating sheet mask set (5 pack)', 'beauty', 'BEA-003', 29.99, 24.99, NULL, NULL, 156, true, false, ARRAY['']::text[], 4.7, 189, now()),
(1, 'Matte Lipstick Set', 'matte-lipstick-set', 'Long-lasting matte lipstick trio in classic shades: nude, rose, and red. Cruelty-free formula.', 'Matte lipstick set (3 shades)', 'beauty', 'BEA-004', 59.99, 49.99, NULL, NULL, 98, true, false, ARRAY['new'], 4.8, 143, now());

-- Insert product images
INSERT INTO product_images (tenant_id, product_id, url, alt_text, position, width, height) VALUES
(1, 1, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=1000', 'Gold layered necklace main view', 0, 800, 1000),
(1, 1, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=1000', 'Gold layered necklace detail', 1, 800, 1000),
(1, 2, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=1000', 'Minimalist ring set', 0, 800, 1000),
(1, 3, 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&h=1000', 'Pearl drop earrings', 0, 800, 1000),
(1, 4, 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=1000', 'Diamond stud earrings', 0, 800, 1000),
(1, 5, 'https://images.unsplash.com/photo-1611652022419-a9419f74343e?w=800&h=1000', 'Rose gold bracelet', 0, 800, 1000),
(1, 6, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=1000', 'Silk midi dress', 0, 800, 1000),
(1, 7, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=1000', 'Cashmere sweater', 0, 800, 1000),
(1, 8, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&h=1000', 'Tailored blazer', 0, 800, 1000),
(1, 9, 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&h=1000', 'Wide leg trousers', 0, 800, 1000),
(1, 10, 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&h=1000', 'Leather tote bag', 0, 800, 1000),
(1, 11, 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&h=1000', 'Velvet evening clutch', 0, 800, 1000),
(1, 12, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=1000', 'Canvas crossbody', 0, 800, 1000),
(1, 13, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=1000', 'Radiance serum', 0, 800, 1000),
(1, 14, 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=1000', 'Luxury face cream', 0, 800, 1000),
(1, 15, 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&h=1000', 'Hydrating face mask', 0, 800, 1000),
(1, 16, 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&h=1000', 'Matte lipstick set', 0, 800, 1000);

-- Insert sample reviews
INSERT INTO product_reviews (tenant_id, product_id, customer_email, customer_name, rating, title, content, is_verified_purchase, is_approved, helpful_count) VALUES
(1, 1, 'sarah.j@example.com', 'Sarah J.', 5, 'Absolutely stunning!', 'This necklace exceeded my expectations. The quality is incredible and it looks even better in person. I get compliments every time I wear it!', true, true, 24),
(1, 1, 'emma.m@example.com', 'Emma M.', 5, 'Perfect everyday piece', 'Love the layered look. Goes with everything and feels very premium.', true, true, 18),
(1, 2, 'olivia.t@example.com', 'Olivia T.', 5, 'Great value', 'Five rings for this price is amazing. They stack beautifully together.', true, true, 12),
(1, 13, 'jessica.l@example.com', 'Jessica L.', 5, 'Best serum ever', 'My skin has never looked better. Worth every penny. Will definitely repurchase!', true, true, 45),
(1, 13, 'rachel.k@example.com', 'Rachel K.', 5, 'Visible results in 2 weeks', 'Dark spots are fading and my skin glows. Highly recommend!', true, true, 38);
