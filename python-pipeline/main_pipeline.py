import logging
import os
import pandas as pd
from config import settings
from scrapers.data_scraper import fetch_all_raw_products
from filters.data_filter import filter_and_shortlist_products
from ai.ai_factory import AIOrchestrator
from db.db_publisher import publish_products_to_db, log_pipeline_run

def setup_logging():
    log_path = os.path.join(os.path.dirname(__file__), settings.log_file)
    logging.basicConfig(
        level=settings.log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_path),
            logging.StreamHandler()
        ]
    )

def run_pipeline():
    setup_logging()
    logger = logging.getLogger(__name__)
    logger.info("Starting AI Dropshipping Pipeline...")

    try:
        # 1. Scrape
        raw_products = fetch_all_raw_products()
        fetched_count = len(raw_products)
        if not raw_products: return

        # 2. Filter
        shortlisted_df = filter_and_shortlist_products(raw_products)
        shortlisted_count = len(shortlisted_df)
        if shortlisted_df.empty: return

        # 3. AI Enhance (via AIOrchestrator + enhance_product_with_ai)
        logger.info(f"Enhancing {shortlisted_count} products with AI Orchestrator...")
        orchestrator = AIOrchestrator(store_id=settings.tenant_id)
        enhanced_products = []
        for _, row in shortlisted_df.iterrows():
            # Ensure row has fields needed for math score (mock API may lack these)
            row = row.copy()
            if "estimated_margin_pct" not in row or pd.isna(row.get("estimated_margin_pct")):
                row["estimated_margin_pct"] = 40.0
            if "shipping_days_us" not in row or pd.isna(row.get("shipping_days_us")):
                row["shipping_days_us"] = 7
            if "supplier_rating" not in row or pd.isna(row.get("supplier_rating")):
                r = row.get("rating")
                row["supplier_rating"] = r.get("rate", r) if isinstance(r, dict) else (r or 4.0)
            result = orchestrator.evaluate_product(row)
            data = row.to_dict()
            data["ai_title"] = result.get("ai_title") or row.get("title", "Untitled")
            data["ai_description"] = result.get("ai_description") or row.get("description", "")
            data["ai_profit_score"] = result.get("final_score", 50)
            data["math_score"] = result.get("math_score", 0)
            data["market_score"] = result.get("market_score", 0)
            enhanced_products.append(data)
            logger.info(
                "Product: %s | math=%.1f market=%.1f final=%.1f | ai_title=%s",
                row.get("title", "?")[:40],
                result.get("math_score", 0),
                result.get("market_score", 0),
                result.get("final_score", 0),
                (result.get("ai_title") or "")[:40],
            )
        
        # 4. Publish
        if enhanced_products:
            final_df = pd.DataFrame(enhanced_products)
            publish_products_to_db(final_df)
            log_pipeline_run("INFO", fetched_count, shortlisted_count, len(enhanced_products), "Success")
            logger.info("Pipeline completed successfully!")
            # Summary table
            print("\n" + "=" * 80)
            print("PHASE 2 + 2.5 PIPELINE SUMMARY")
            print("=" * 80)
            print(f"{'Raw Title':<45} {'Math':>6} {'Market':>6} {'Final':>6} {'AI Title':<30}")
            print("-" * 80)
            for p in enhanced_products:
                raw = str(p.get("title", ""))[:44]
                ai = str(p.get("ai_title", ""))[:29]
                math = p.get("math_score", 0)
                mkt = p.get("market_score", 0)
                final = p.get("ai_profit_score", 0)
                print(f"{raw:<45} {math:>6.1f} {mkt:>6.1f} {final:>6.1f} {ai:<30}")
            print("-" * 80)
            print(f"Total: {len(enhanced_products)} products | Fetched: {fetched_count} | Shortlisted: {shortlisted_count}")
            print("=" * 80)
        else:
            logger.error("AI enhancement failed.")

    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        log_pipeline_run("ERROR", 0, 0, 0, str(e))

if __name__ == "__main__":
    run_pipeline()
