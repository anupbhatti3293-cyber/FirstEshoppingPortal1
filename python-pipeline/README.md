# LuxeHaven AI Pipeline — Trending Products Automation

Automated Python pipeline that fetches products, filters by trending logic, enhances with Gemini AI, and publishes to Supabase.

## Quick Start

### 1. Install dependencies

```bash
cd python-pipeline
pip install -r requirements.txt
```

### 2. Configure environment

Copy `.env.example` to `.env` and set:

- `SUPABASE_DB_POOLER_URL` or `DB_SQLALCHEMY_URI` — Supabase connection string  
  **If your password contains `#` or `@`**, URL-encode them: `#` → `%23`, `@` → `%40`
- `GEMINI_API_KEY` — Get at [Google AI Studio](https://aistudio.google.com/apikey)

You can also use the project root `.env` (Next.js app) — the pipeline loads from both.

### 3. Run the pipeline

**From project root:**

```bash
py -3.11 python-pipeline\main_pipeline.py
```

**Or use the batch script (Windows):**

```bash
python-pipeline\run_pipeline.bat
```

## Pipeline flow

1. **Scrape** — Fetches products from mock API (fakestoreapi.com) or live suppliers
2. **Filter** — Applies min rating, price range, category filters; shortlists top N by rating
3. **AI Enhance** — Uses Gemini 2.5 Flash to generate SEO-friendly titles and descriptions
4. **Publish** — Inserts into `supplier_products` table in Supabase

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `run_mode` | MOCK | MOCK = fakestoreapi, LIVE = real suppliers |
| `max_shortlist` | 10 | Max products to AI-enhance and publish |
| `min_rating` | 3.5 | Minimum product rating filter |
| `price_min_usd` / `price_max_usd` | 10–500 | Price range filter |
| `GEMINI_MODEL` | gemini-2.5-flash | AI model for enhancements |

## Troubleshooting

- **`module 'google.genai' has no attribute 'configure'`** — Use `google.generativeai` (fixed in this codebase)
- **`models/gemini-pro is not found`** — Use `gemini-2.5-flash` (deprecated models removed)
- **`could not translate host name`** — Password has `#` or `@`; URL-encode in `.env`
