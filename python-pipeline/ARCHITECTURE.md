# LuxeHaven AI Dropshipping Pipeline — Enterprise Architecture

> Authored by: Claude (Anthropic) — 25+ year enterprise architect perspective  
> Integrated with: LuxeHaven Next.js 14 + Supabase (PostgreSQL) existing codebase  
> Last updated: March 2026

---

## 1. Big Picture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LUXEHAVEN PLATFORM                           │
│                                                                     │
│  ┌─────────────────────┐        ┌──────────────────────────────┐   │
│  │   Next.js 14 App     │        │    Python AI Pipeline        │   │
│  │   (Port 3000)        │        │    (Standalone Service)      │   │
│  │                      │        │                              │   │
│  │  Admin Panel ────────┼──READ──┤  main_pipeline.py (cron)    │   │
│  │  /admin/suppliers    │        │  data_scraper.py             │   │
│  │  /admin/dashboard    │        │  data_filter.py              │   │
│  │                      │        │  ai_content_generator.py     │   │
│  │  StyleMate AI ───────┼──────  │  db_publisher.py             │   │
│  │  (Gemini 2.5 Flash)  │        │  pipeline_logger.py          │   │
│  └──────────┬───────────┘        └──────────────┬───────────────┘   │
│             │                                   │                   │
│             └──────────────┬────────────────────┘                   │
│                            │                                        │
│                    ┌───────▼────────┐                               │
│                    │   Supabase     │                               │
│                    │  PostgreSQL    │                               │
│                    │                │                               │
│                    │  products      │                               │
│                    │  pipeline_runs │                               │
│                    │  pipeline_logs │                               │
│                    │  staged_products│                              │
│                    └────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Repository Structure

```
FirstEshoppingPortal1/
├── app/                          # Next.js 14 App (existing — DO NOT TOUCH)
├── lib/                          # Next.js lib (existing — DO NOT TOUCH)
├── supabase/
│   └── migrations/
│       └── 20260314_009_pipeline.sql   # NEW: pipeline tables
│
└── python-pipeline/              # NEW: entire Python service lives here
    ├── ARCHITECTURE.md           # This file
    ├── PRD.md                    # Product Requirements
    ├── GEMINI_PROMPT.md          # Copy-paste prompt for Gemini
    ├── README.md                 # Setup instructions
    ├── requirements.txt          # Python dependencies
    ├── .env.example              # Pipeline env vars template
    ├── config.py                 # Central config (reads .env)
    │
    ├── scrapers/
    │   ├── __init__.py
    │   ├── data_scraper.py       # Module 1: Fetch from CJ + Kalodata
    │   ├── cj_client.py          # CJ Dropshipping API client
    │   └── kalodata_client.py    # Kalodata API client
    │
    ├── processing/
    │   ├── __init__.py
    │   └── data_filter.py        # Module 2: Filter + score + shortlist
    │
    ├── ai/
    │   ├── __init__.py
    │   └── ai_content_generator.py  # Module 3: Gemini AI transformation
    │
    ├── database/
    │   ├── __init__.py
    │   └── db_publisher.py       # Module 4: Write to Supabase
    │
    ├── logging/
    │   ├── __init__.py
    │   └── pipeline_logger.py    # Structured logging + admin panel reports
    │
    ├── main_pipeline.py          # Master controller — runs all modules
    └── tests/
        ├── test_scraper.py
        ├── test_filter.py
        ├── test_ai_generator.py
        └── test_db_publisher.py
```

---

## 3. Database Schema (New Tables — Migration 009)

### 3.1 `pipeline_runs` — One row per daily run
```sql
CREATE TABLE pipeline_runs (
  id              bigserial PRIMARY KEY,
  tenant_id       bigint NOT NULL DEFAULT 1,
  run_date        date NOT NULL DEFAULT CURRENT_DATE,
  status          text NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','completed','failed','partial')),
  products_fetched   integer DEFAULT 0,
  products_filtered  integer DEFAULT 0,
  products_staged    integer DEFAULT 0,
  products_published integer DEFAULT 0,
  error_count        integer DEFAULT 0,
  started_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz,
  summary_notes      text
);
```

### 3.2 `pipeline_logs` — Detailed event log per run
```sql
CREATE TABLE pipeline_logs (
  id          bigserial PRIMARY KEY,
  run_id      bigint REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  tenant_id   bigint NOT NULL DEFAULT 1,
  level       text NOT NULL CHECK (level IN ('INFO','WARNING','ERROR')),
  module      text NOT NULL,  -- e.g. 'data_scraper', 'ai_generator'
  message     text NOT NULL,
  metadata    jsonb,          -- extra context (product_id, api_response etc)
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

### 3.3 `staged_products` — AI-processed products awaiting admin approval
```sql
CREATE TABLE staged_products (
  id              bigserial PRIMARY KEY,
  tenant_id       bigint NOT NULL DEFAULT 1,
  run_id          bigint REFERENCES pipeline_runs(id),
  source_platform text NOT NULL CHECK (source_platform IN ('cj','aliexpress','kalodata')),
  source_product_id text NOT NULL,
  original_title  text NOT NULL,
  original_price_usd  decimal(10,2),
  original_image_url  text,
  original_product_url text,
  original_rating     decimal(3,2),
  -- AI-generated fields (US)
  ai_title_us     text,
  ai_description_us text,
  ai_short_desc_us text,
  ai_seo_title_us text,
  ai_seo_desc_us  text,
  ai_tags_us      text[],
  -- AI-generated fields (UK)
  ai_title_uk     text,
  ai_description_uk text,
  ai_short_desc_uk text,
  ai_seo_title_uk text,
  ai_seo_desc_uk  text,
  ai_tags_uk      text[],
  -- Scoring
  filter_score    decimal(5,2),  -- composite score from data_filter.py
  quality_score   integer,       -- 0-100 from StyleMate AI
  qa_badge        text,
  -- Status
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','published')),
  admin_notes     text,
  approved_by     bigint REFERENCES admin_users(id),
  approved_at     timestamptz,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

---

## 4. Module Responsibilities

### Module 1: `scrapers/data_scraper.py`
- Calls CJ Dropshipping API → top 25 products by sales volume
- Calls Kalodata API → top 25 trending products
- Returns two `pd.DataFrame` objects with standardised schema
- Falls back to mock data if API keys not configured
- **Does NOT filter, transform, or write to DB**

### Module 2: `processing/data_filter.py`
- Takes both DataFrames as input
- Applies scoring algorithm:
  - Rating >= 4.0: mandatory filter (hard cutoff)
  - Appears on both platforms: +30 points bonus
  - Rating 4.5+: +20 points
  - Price in £15-£150 sweet spot: +15 points
  - Review count >= 100: +10 points
- Returns top 10 products as a single DataFrame
- **Does NOT call any external APIs**

### Module 3: `ai/ai_content_generator.py`
- Takes the top 10 DataFrame as input
- Calls Gemini 2.5 Flash API for each product:
  - US title + description + short desc + SEO + tags
  - UK title + description + short desc + SEO + tags
  - Quality score (0-100) + QA badge
- Returns enriched DataFrame with all AI fields populated
- Uses same prompt format as existing StyleMate AI (lib/aiProvider.ts)
- **Does NOT write to DB directly**

### Module 4: `database/db_publisher.py`
- Takes enriched DataFrame as input
- Writes to `staged_products` table (status = 'pending')
- Does NOT auto-publish to live `products` table
- Admin must approve in Admin Panel → Suppliers → Staged Products
- On approval, copies to `products` table using same schema as existing products
- **Critical: No auto-publish without admin approval**

### Module 5: `logging/pipeline_logger.py`
- Creates pipeline_run record at start
- Logs every INFO/WARNING/ERROR event to pipeline_logs
- Updates pipeline_run on completion with summary
- Admin can view logs at `/admin/suppliers/pipeline-logs`

### Master: `main_pipeline.py`
- Orchestrates all modules in sequence
- Handles overall try/except — logs failure without crashing
- Can be run manually or via cron job
- Cron expression: `0 6 * * *` (6am UTC daily)

---

## 5. Data Flow Diagram

```
main_pipeline.py
      │
      ├─1─► data_scraper.py
      │         ├── fetch_cj_top_25()      → CJ API
      │         └── fetch_kalodata_trends() → Kalodata API
      │         └── Returns: df_cj, df_kalodata
      │
      ├─2─► data_filter.py
      │         ├── merge_and_deduplicate(df_cj, df_kalodata)
      │         ├── apply_rating_filter()   → hard cutoff
      │         ├── score_products()        → composite score
      │         └── Returns: df_top10
      │
      ├─3─► ai_content_generator.py
      │         ├── for each product in df_top10:
      │         │     ├── generate_titles()
      │         │     ├── generate_descriptions()
      │         │     ├── generate_seo()
      │         │     └── generate_quality_score()
      │         └── Returns: df_enriched
      │
      ├─4─► db_publisher.py
      │         ├── create_pipeline_run()   → pipeline_runs table
      │         ├── write_staged_products() → staged_products table
      │         └── Returns: run_id, count
      │
      └─5─► pipeline_logger.py
                ├── update_run_summary()
                └── send_admin_notification() (optional)
```

---

## 6. Integration Points with Existing Next.js App

### 6.1 Admin Panel — New Pages Needed (Next.js side)
```
/admin/suppliers/staged          # Review AI-processed products before publishing
/admin/suppliers/pipeline-logs   # View run history and logs
```

### 6.2 New API Routes Needed (Next.js side)
```
GET  /api/admin/pipeline/runs          # List all pipeline runs
GET  /api/admin/pipeline/runs/[id]     # Single run details + logs
GET  /api/admin/pipeline/staged        # List staged products pending approval
POST /api/admin/pipeline/staged/[id]/approve   # Approve → publish to products
POST /api/admin/pipeline/staged/[id]/reject    # Reject with notes
```

### 6.3 Shared Database Connection
- Python pipeline uses the same Supabase PostgreSQL
- Connection string from env var `SUPABASE_DB_POOLER_URL` (already in .env.example)
- Python uses `psycopg2` + `sqlalchemy` for DB writes
- Uses `tenant_id = 1` on ALL inserts (consistent with Next.js app)

---

## 7. Environment Variables (python-pipeline/.env)

```bash
# Supabase (same as Next.js app)
SUPABASE_DB_POOLER_URL=postgres://postgres.xxx:password@host/postgres

# AI Provider (same key as Next.js GEMINI_API_KEY)
GEMINI_API_KEY=your-gemini-key

# CJ Dropshipping API
CJ_API_KEY=your-cj-api-key
CJ_EMAIL=your-cj-account-email

# Kalodata API (paid — or set MOCK_MODE=true to skip)
KALODATA_API_KEY=your-kalodata-key

# Pipeline Config
MOCK_MODE=true                  # Set false in production
PIPELINE_TOP_N_FETCH=25         # Products to fetch per source
PIPELINE_TOP_N_FINAL=10         # Products to stage after filtering
MIN_RATING=4.0                  # Hard rating cutoff
PRICE_MIN_USD=10                # Min product price
PRICE_MAX_USD=200               # Max product price
TENANT_ID=1
LOG_LEVEL=INFO
LOG_FILE=logs/pipeline.log
```

---

## 8. Deployment Options

### Option A: Local Cron (Development)
```bash
# Add to crontab
0 6 * * * cd /path/to/python-pipeline && python main_pipeline.py
```

### Option B: GitHub Actions (Recommended for Production)
```yaml
# .github/workflows/daily-pipeline.yml
on:
  schedule:
    - cron: '0 6 * * *'  # 6am UTC daily
  workflow_dispatch:      # Manual trigger from GitHub UI
jobs:
  run-pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r python-pipeline/requirements.txt
      - run: python python-pipeline/main_pipeline.py
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          SUPABASE_DB_POOLER_URL: ${{ secrets.SUPABASE_DB_POOLER_URL }}
          CJ_API_KEY: ${{ secrets.CJ_API_KEY }}
```

### Option C: Vercel Cron (Alternative)
- Add a Next.js API route `/api/cron/pipeline`
- Call Python pipeline via subprocess or separate microservice
- Set in `vercel.json`: `{ "crons": [{ "path": "/api/cron/pipeline", "schedule": "0 6 * * *" }] }`

---

## 9. Security Rules

1. Python pipeline uses **service role key** — never the anon key
2. All DB writes include `tenant_id = 1` — multi-tenant safe
3. Products go to `staged_products` first — **never auto-publish**
4. API keys stored in `.env` — never hardcoded
5. `.env` is in `.gitignore` — never committed
6. `MOCK_MODE=true` by default — safe to run without real API keys

---

## 10. Build Order (Recommended)

Build one module at a time, test each before moving on:

```
Phase 1 (Week 1):  config.py + pipeline_logger.py + DB migration 009
Phase 2 (Week 1):  data_scraper.py (mock mode first, real APIs after)
Phase 3 (Week 2):  data_filter.py + tests
Phase 4 (Week 2):  ai_content_generator.py (reuse StyleMate prompts)
Phase 5 (Week 3):  db_publisher.py + staged_products flow
Phase 6 (Week 3):  main_pipeline.py + cron setup
Phase 7 (Week 4):  Next.js admin pages for staged review + pipeline logs
Phase 8 (Week 4):  GitHub Actions cron deployment
```
