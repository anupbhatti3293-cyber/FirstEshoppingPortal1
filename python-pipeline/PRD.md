# LuxeHaven AI Dropshipping Pipeline — Product Requirements Document (PRD)

> Version: 1.0  
> Platform: LuxeHaven (Next.js 14 + Supabase)  
> Pipeline: Python 3.11 standalone service  

---

## 1. Objective

Build a fully automated, zero-manual-intervention pipeline that:
1. Fetches top 25 trending/selling products daily from CJ Dropshipping and Kalodata
2. Filters and scores them to shortlist the best 10
3. Uses Gemini AI to rewrite titles and descriptions in luxury US/UK English
4. Stages processed products for admin review before going live
5. Logs every step for admin visibility

**Business goal:** Reduce product research and copywriting time from 8+ hours/day to 0 hours/day.

---

## 2. Data Sources

### 2.1 CJ Dropshipping (Primary — Supplier API)
- **API:** CJ Dropshipping official REST API
- **Auth:** CJ_API_KEY + CJ_EMAIL in .env
- **Endpoint:** `https://developers.cjdropshipping.com/api2.0/v1/product/list`
- **Fetch:** Top 25 products sorted by sales volume
- **Fields needed:** product_id, title, price_usd, rating, image_url, product_url, category
- **Fallback:** Mock data if MOCK_MODE=true or key missing

### 2.2 Kalodata (Trend Intelligence)
- **API:** Kalodata REST API (paid subscription required)
- **Auth:** KALODATA_API_KEY in .env  
- **Purpose:** Surface trending products before they peak on sales charts
- **Fetch:** Top 25 trending products in beauty/fashion/home categories
- **Fields needed:** product_id, title, trend_score, price_usd, rating, image_url, product_url
- **Fallback:** Mock data if MOCK_MODE=true or key missing
- **Note:** If Kalodata subscription not available, replace with Google Trends + AliExpress scrape

---

## 3. Filtering & Scoring Logic (`data_filter.py`)

### 3.1 Hard Filters (eliminate before scoring)
| Rule | Value | Action |
|------|-------|--------|
| Rating | < 4.0 | Discard |
| Price | < $10 USD | Discard |
| Price | > $200 USD | Discard |
| Title | Empty/null | Discard |
| Image | Missing | Discard |

### 3.2 Scoring Algorithm (higher = better)
| Criteria | Points | Reason |
|----------|--------|--------|
| Appears on BOTH platforms | +30 | Validated by trend AND sales |
| Rating >= 4.5 | +20 | Premium quality signal |
| Rating 4.0-4.4 | +10 | Acceptable quality |
| Price £15-£80 (sweet spot) | +15 | Best margin for LuxeHaven |
| Review count >= 500 | +15 | Strong social proof |
| Review count 100-499 | +10 | Decent social proof |
| Category: Beauty/Jewellery | +10 | Core LuxeHaven categories |
| Category: Clothing/Bags | +5 | Secondary categories |

### 3.3 Final Selection
- Sort by composite score descending
- Take top 10
- If fewer than 10 pass filters, take all that pass (do not lower standards)

---

## 4. AI Content Generation (`ai_content_generator.py`)

### 4.1 Model
- **Provider:** Google Gemini 2.5 Flash (same as StyleMate AI in Next.js app)
- **API Key:** Shared `GEMINI_API_KEY` from env

### 4.2 Output per Product
For each of the 10 products, generate:

| Field | US Version | UK Version |
|-------|-----------|------------|
| Title | American English, lifestyle-forward | British English, quality-focused |
| Full Description | 300-500 words | 300-500 words |
| Short Description | <100 words | <100 words |
| SEO Meta Title | max 60 chars | max 60 chars |
| SEO Meta Description | max 160 chars | max 160 chars |
| Tags | 5-10 tags | 5-10 tags |
| Quality Score | 0-100 integer | (same) |
| QA Badge | none/verified/qa_approved/engineer_tested | (same) |

### 4.3 Prompt Standards
- Brand voice: luxurious, trustworthy, aspirational
- No supplier names (CJ, AliExpress etc)
- No model numbers or Chinese-style keyword stuffing
- No unverifiable health claims
- UK: use colour/favourite/organise spelling

---

## 5. Database Publishing (`db_publisher.py`)

### 5.1 Staging First — CRITICAL RULE
- ALL processed products go to `staged_products` table first
- Status = 'pending' by default
- **NO product goes live automatically**

### 5.2 Admin Approval Flow
```
Pipeline runs → staged_products (pending)
                      │
              Admin reviews in panel
              /admin/suppliers/staged
                      │
           ┌──────────┴──────────┐
      Approve                 Reject
           │                     │
    products table          staged_products
    (status=active)         (status=rejected)
```

### 5.3 On Approval
- Copy all fields from `staged_products` to `products` table
- Use existing `products` schema (tenant_id=1, is_active=true)
- Copy AI fields to `ai_product_analysis` table
- Mark staged_product as published

---

## 6. Logging & Reporting (`pipeline_logger.py`)

### 6.1 Log Levels
- `INFO`: Normal operation (fetched 25 products, filtered to 10, etc.)
- `WARNING`: Non-critical issues (1 product skipped due to missing image)
- `ERROR`: Critical failures (API timeout, DB connection failed)

### 6.2 Admin Panel Summary
After each run, admin sees in `/admin/suppliers/pipeline-logs`:
```
Run #47 — 14 March 2026 06:00 UTC — ✅ Completed
├── Fetched: 25 (CJ) + 25 (Kalodata) = 50 products
├── After filtering: 12 products passed
├── AI processed: 10 products
├── Staged for review: 10 products
├── Warnings: 2 (3 products below rating threshold)
└── Errors: 0
```

### 6.3 Log Retention
- Keep last 90 days of pipeline_logs in DB
- Local log file: `python-pipeline/logs/pipeline.log` (rotated weekly)

---

## 7. Success Criteria

| Metric | Target |
|--------|--------|
| Pipeline runtime | < 5 minutes end-to-end |
| Products fetched per run | 50 (25 per source) |
| Products staged per run | 10 |
| AI generation success rate | >= 95% |
| Pipeline uptime | >= 99% (Monday-Friday) |
| Zero auto-publishes | 100% — admin approval always required |
| Admin review time | < 10 minutes per batch of 10 |

---

## 8. Out of Scope (Phase 1)

- Automatic price adjustment based on competitor pricing
- Inventory sync from suppliers
- Automatic re-ordering
- Customer-facing "new arrivals" notifications
- Multi-tenant pipeline (tenant_id=1 only in Phase 1)
