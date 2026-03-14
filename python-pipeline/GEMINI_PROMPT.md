# Gemini Master Prompt — LuxeHaven AI Pipeline

> Copy and paste this entire prompt into Gemini (Project IDX or Firebase Studio).
> Feed it module by module — do NOT ask for all modules at once.

---

## CONTEXT BLOCK (Feed this FIRST before any module prompt)

```
You are acting as a Senior Python Engineer with 25+ years of experience building
enterprise-grade data pipelines and e-commerce automation systems.

Project: LuxeHaven — a premium US/UK dropshipping platform built on Next.js 14
+ Supabase (PostgreSQL). I am building a Python automation pipeline that runs
separately from the Next.js app.

Critical rules you must follow in ALL code you generate:
1. NO print() statements anywhere — use Python logging module only
2. ALL functions must have type hints (-> pd.DataFrame, -> bool, etc.)
3. ALL functions must have docstrings (purpose, args, returns, raises)
4. ALL external calls (APIs, DB) must be wrapped in try/except blocks
5. If one item fails, log the error and continue — never crash the loop
6. Use logging levels correctly: INFO for success, WARNING for skips, ERROR for failures
7. Code must be production-ready — no TODOs, no placeholder comments like "add logic here"
8. Every module is SINGLE RESPONSIBILITY — it does one job only
9. Database tenant_id is always 1 (single-tenant for now)
10. MOCK_MODE environment variable: when True, return realistic mock data instead of calling real APIs

Project structure (your code goes in python-pipeline/ folder):
 python-pipeline/
  ├── config.py
  ├── scrapers/data_scraper.py
  ├── processing/data_filter.py
  ├── ai/ai_content_generator.py
  ├── database/db_publisher.py
  ├── logging/pipeline_logger.py
  └── main_pipeline.py

Database: Supabase PostgreSQL
AI Model: Google Gemini 2.5 Flash via google-generativeai Python SDK
Key tables: products, staged_products, pipeline_runs, pipeline_logs
```

---

## MODULE 1 PROMPT — `config.py`

```
Generate python-pipeline/config.py

This is the central configuration module. It must:
1. Use python-dotenv to load .env file
2. Define a Config dataclass with ALL env variables as typed fields:
   - supabase_db_url: str
   - gemini_api_key: str
   - cj_api_key: str
   - cj_email: str
   - kalodata_api_key: str
   - mock_mode: bool (default True)
   - top_n_fetch: int (default 25)
   - top_n_final: int (default 10)
   - min_rating: float (default 4.0)
   - price_min_usd: float (default 10.0)
   - price_max_usd: float (default 200.0)
   - tenant_id: int (default 1)
   - log_level: str (default 'INFO')
   - log_file: str (default 'logs/pipeline.log')
3. Include a load_config() function that returns a Config instance
4. If a required key is missing and mock_mode is False, raise a clear ValueError
5. Include a validate_config() function that checks all required keys are present
```

---

## MODULE 2 PROMPT — `scrapers/data_scraper.py`

```
Generate python-pipeline/scrapers/data_scraper.py

This module fetches raw product data from two sources.

Functions to create:

1. fetch_cj_top_products(config: Config, limit: int = 25) -> pd.DataFrame
   - If config.mock_mode is True: return 25 realistic mock products
   - If mock_mode is False: call CJ Dropshipping API
     URL: https://developers.cjdropshipping.com/api2.0/v1/product/list
     Auth header: CJ-Access-Token (use config.cj_api_key)
     Sort by: salesVolume DESC
   - Return DataFrame with EXACTLY these columns:
     product_id, title, price_usd, rating, review_count,
     image_url, product_url, category, source_platform='cj'

2. fetch_kalodata_trends(config: Config, limit: int = 25) -> pd.DataFrame
   - If config.mock_mode is True: return 25 realistic mock trending products
   - If mock_mode is False: call Kalodata API
     URL: https://api.kalodata.com/v1/products/trending
     Auth: Bearer token using config.kalodata_api_key
   - Return DataFrame with EXACTLY the same columns as above
     (source_platform='kalodata')

Mock data requirements:
- Use 25 DIFFERENT realistic product names across beauty/jewellery/clothing/bags
- Prices between $8 and $180 USD
- Ratings between 3.5 and 5.0 (some below 4.0 to test filtering)
- Mix of review counts 50-2000
- Real-looking Unsplash image URLs
- CJ and Kalodata mocks should have ~8 overlapping products (same title)
  to test the cross-platform bonus scoring in data_filter.py
```

---

## MODULE 3 PROMPT — `processing/data_filter.py`

```
Generate python-pipeline/processing/data_filter.py

This module filters and scores raw product data to produce the top N products.

Functions to create:

1. apply_hard_filters(df: pd.DataFrame, config: Config) -> pd.DataFrame
   - Remove rows where rating < config.min_rating
   - Remove rows where price_usd < config.price_min_usd
   - Remove rows where price_usd > config.price_max_usd
   - Remove rows where title is null/empty
   - Remove rows where image_url is null/empty
   - Log how many rows were removed and why

2. score_products(df: pd.DataFrame) -> pd.DataFrame
   - Add a 'composite_score' column using this exact logic:
     +30 if product appears on both CJ and Kalodata (match by title similarity >= 80%)
     +20 if rating >= 4.5
     +10 if rating >= 4.0 and < 4.5
     +15 if price_usd between 15 and 120
     +15 if review_count >= 500
     +10 if review_count >= 100 and < 500
     +10 if category in ['beauty', 'jewellery', 'jewelry']
     +5  if category in ['clothing', 'bags', 'purses', 'accessories']
   - Use fuzzywuzzy or rapidfuzz for title matching

3. get_top_products(df_cj: pd.DataFrame, df_kalodata: pd.DataFrame,
                    config: Config) -> pd.DataFrame
   - Combines both DataFrames
   - Calls apply_hard_filters()
   - Calls score_products()
   - Deduplicates (keep highest-scored version if same product appears twice)
   - Returns top config.top_n_final products sorted by composite_score DESC
   - Logs final selection summary
```

---

## MODULE 4 PROMPT — `ai/ai_content_generator.py`

```
Generate python-pipeline/ai/ai_content_generator.py

This module uses Gemini 2.5 Flash to generate luxury US/UK content for each product.

Functions to create:

1. generate_product_content(product: dict, config: Config) -> dict
   - Takes a single product dict as input
   - Makes 4 parallel Gemini API calls (title, description, seo, quality)
   - Uses EXACTLY these prompts (copy precisely):

   TITLE PROMPT:
   System: You are a conversion copywriter for LuxeHaven, a premium US/UK
   dropshipping store. Brand voice: luxurious, trustworthy, aspirational.
   Return ONLY a raw JSON object on a single line:
   {"us":"title for US market","uk":"title for UK market"}
   Rules: Emotional hook + key feature + trust signal.
   No supplier names, no keyword stuffing.

   DESCRIPTION PROMPT:
   System: You are a conversion copywriter for LuxeHaven.
   Return ONLY a raw JSON object:
   {"us":{"full":"300-500 word description","short":"under 100 word summary"},
    "uk":{"full":"300-500 word description","short":"under 100 word summary"}}
   US: American English, lifestyle-forward.
   UK: British English (colour/favourite/organise), quality-focused.

   SEO PROMPT:
   System: You are an SEO specialist for LuxeHaven.
   Return ONLY a raw JSON object:
   {"us":{"metaTitle":"max 60 chars","metaDescription":"max 160 chars",
   "tags":["t1","t2","t3","t4","t5"]},
   "uk":{"metaTitle":"max 60 chars","metaDescription":"max 160 chars",
   "tags":["t1","t2","t3","t4","t5"]}}

   QUALITY PROMPT:
   System: You are a product quality analyst for LuxeHaven.
   Return ONLY a raw JSON object:
   {"score":75,"badge":"qa_approved","notes":"brief notes"}
   Badge rules: 0-49=none,50-69=verified,70-84=qa_approved,85-100=engineer_tested

   - Parse all 4 JSON responses robustly (strip ```json fences if present)
   - If any single call fails, log warning and use empty string defaults
   - Returns a dict with all AI fields populated

2. enrich_products(df: pd.DataFrame, config: Config) -> pd.DataFrame
   - Iterates over each row in the DataFrame
   - Calls generate_product_content() for each
   - Adds all AI fields as new columns to the DataFrame
   - If config.mock_mode: return DataFrame with realistic mock AI content
   - Logs progress: "Processing product 1/10: {title}"
   - Returns enriched DataFrame
```

---

## MODULE 5 PROMPT — `database/db_publisher.py`

```
Generate python-pipeline/database/db_publisher.py

This module writes AI-enriched products to Supabase PostgreSQL.

Use psycopg2 for database connection.
Connection string from config.supabase_db_url.

Functions to create:

1. create_pipeline_run(conn, config: Config) -> int
   - Inserts a row into pipeline_runs table (status='running')
   - Returns the new run_id

2. write_staged_products(conn, df: pd.DataFrame,
                         run_id: int, config: Config) -> int
   - Inserts each row from df into staged_products table
   - Status = 'pending' (NEVER 'published' or 'active')
   - Maps DataFrame columns to staged_products columns exactly
   - Uses executemany() for batch insert efficiency
   - Returns count of rows inserted
   - CRITICAL: If a product with same source_product_id already exists
     in staged_products with status='pending', UPDATE it instead of inserting

3. complete_pipeline_run(conn, run_id: int, stats: dict) -> None
   - Updates pipeline_runs row: status='completed', completed_at=now()
   - Sets products_fetched, products_filtered, products_staged from stats dict

4. fail_pipeline_run(conn, run_id: int, error_message: str) -> None
   - Updates pipeline_runs row: status='failed', completed_at=now()
   - Saves error_message to summary_notes

5. approve_staged_product(conn, staged_id: int,
                          admin_id: int, config: Config) -> int
   - Called from Next.js API route (via direct DB call or can be a separate script)
   - Copies staged_product to products table using existing products schema
   - Sets is_active=True, tenant_id=1
   - Updates staged_product status to 'published'
   - Returns new product_id in products table
   - Wraps everything in a transaction (COMMIT or ROLLBACK)
```

---

## MODULE 6 PROMPT — `main_pipeline.py`

```
Generate python-pipeline/main_pipeline.py

This is the master controller that orchestrates all modules.

Structure:

1. Configure logging at startup (file + console handlers)
2. Load config via load_config()
3. Validate config via validate_config()
4. Connect to database
5. Create pipeline run record
6. Run each module in sequence with timing:
   a. data_scraper: fetch_cj_top_products() + fetch_kalodata_trends()
   b. data_filter: get_top_products()
   c. ai_content_generator: enrich_products()
   d. db_publisher: write_staged_products()
7. Complete pipeline run with summary stats
8. If any module raises an unhandled exception:
   - Log the full traceback
   - Call fail_pipeline_run() to record failure in DB
   - Exit with code 1
9. On success: exit with code 0

At the bottom:
if __name__ == '__main__':
    main()

Also add command-line arg --dry-run that runs everything EXCEPT
the database write step, to test the pipeline safely.
```

---

## MODULE 7 PROMPT — `requirements.txt`

```
Generate python-pipeline/requirements.txt

Include exact pinned versions for:
- pandas
- requests
- psycopg2-binary
- sqlalchemy
- python-dotenv
- google-generativeai (Gemini SDK)
- rapidfuzz (for fuzzy title matching in data_filter.py)
- python-dateutil

Also generate python-pipeline/.env.example with all variables from config.py
with placeholder values and comments explaining each one.
```

---

## MODULE 8 PROMPT — Supabase Migration SQL

```
Generate supabase/migrations/20260314_009_pipeline_tables.sql

Create these three tables (all idempotent with IF NOT EXISTS):

1. pipeline_runs table (as defined in ARCHITECTURE.md section 3.1)
2. pipeline_logs table (as defined in ARCHITECTURE.md section 3.2)
3. staged_products table (as defined in ARCHITECTURE.md section 3.3)

Also add:
- Indexes on tenant_id, run_id, status, created_at columns
- RLS enabled on all three tables
- Service role can manage all (same pattern as existing migrations)
- A DB function: approve_staged_product(p_staged_id bigint, p_admin_id bigint)
  that does the copy from staged_products to products atomically
```

---

## IMPORTANT NOTES FOR GEMINI

1. **Build one module at a time** — paste one MODULE PROMPT at a time
2. **Always include the CONTEXT BLOCK** at the start of every new Gemini session
3. **After each module**, ask Gemini: "Does this module have any dependencies on other modules not yet built? List them."
4. **Test each module** before moving to the next
5. **The python-pipeline folder is completely separate** from the Next.js app — never import from app/ or lib/
6. **MOCK_MODE=true** while developing — only set to false when real API keys are available
