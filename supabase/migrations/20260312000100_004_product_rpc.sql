/*
  # Product RPC helpers

  - increment_product_view_count: increments products.view_count safely
  - get_product_facets: aggregated facets for catalogue filters (counts, price range, tags)
*/

-- Increment view count for a product (tenant-aware).
CREATE OR REPLACE FUNCTION public.increment_product_view_count(
  p_tenant_id bigint,
  p_product_id bigint,
  p_increment integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET view_count = COALESCE(view_count, 0) + COALESCE(p_increment, 1)
  WHERE tenant_id = p_tenant_id
    AND id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_product_view_count(bigint, bigint, integer) TO anon, authenticated;

-- Facets for product listing filters.
CREATE OR REPLACE FUNCTION public.get_product_facets(
  p_tenant_id bigint,
  p_currency text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH base AS (
  SELECT
    category,
    base_price_usd,
    base_price_gbp,
    tags
  FROM public.products
  WHERE tenant_id = p_tenant_id
    AND is_active = true
),
cats AS (
  SELECT category AS slug, COUNT(*)::int AS count
  FROM base
  GROUP BY category
),
prices AS (
  SELECT
    COALESCE(MIN(CASE WHEN p_currency = 'GBP' THEN base_price_gbp ELSE base_price_usd END), 0)::float AS min_price,
    COALESCE(MAX(CASE WHEN p_currency = 'GBP' THEN base_price_gbp ELSE base_price_usd END), 0)::float AS max_price
  FROM base
),
tags AS (
  SELECT DISTINCT t.tag
  FROM base b
  CROSS JOIN LATERAL unnest(COALESCE(b.tags, ARRAY[]::text[])) AS t(tag)
  WHERE t.tag IS NOT NULL AND t.tag <> ''
)
SELECT jsonb_build_object(
  'categories', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('name', initcap(replace(slug, '-', ' ')), 'slug', slug, 'count', count) ORDER BY slug)
    FROM cats
  ), '[]'::jsonb),
  'priceRange', (SELECT jsonb_build_object('min', min_price, 'max', max_price) FROM prices),
  'availableTags', COALESCE((SELECT jsonb_agg(tag ORDER BY tag) FROM tags), '[]'::jsonb)
);
$$;

GRANT EXECUTE ON FUNCTION public.get_product_facets(bigint, text) TO anon, authenticated;

