# LuxeHaven AI Pipeline — Setup Guide

## Prerequisites
- Python 3.11+
- pip
- Access to Supabase project (same as Next.js app)
- Gemini API key (billing-enabled Google project)

## Setup

```bash
# 1. Navigate to the pipeline folder
cd python-pipeline

# 2. Create a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create your .env file
cp .env.example .env
# Edit .env with your actual values

# 5. Run in mock mode (safe — no real API calls)
MOCK_MODE=true python main_pipeline.py

# 6. Dry run (test everything except DB write)
python main_pipeline.py --dry-run

# 7. Full run (requires real API keys)
MOCK_MODE=false python main_pipeline.py
```

## Build Order

Build and test each module before moving to the next:

1. `config.py` — central config loader
2. `scrapers/data_scraper.py` — fetch products
3. `processing/data_filter.py` — filter and score
4. `ai/ai_content_generator.py` — AI enrichment
5. `database/db_publisher.py` — DB writes
6. `main_pipeline.py` — master controller

## Running on a Schedule

See `ARCHITECTURE.md` Section 8 for GitHub Actions cron setup (recommended).

## Viewing Results

After a pipeline run, view staged products in:
`http://localhost:3000/admin/suppliers/staged`

View run logs in:
`http://localhost:3000/admin/suppliers/pipeline-logs`
