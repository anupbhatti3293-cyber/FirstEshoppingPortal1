import logging
import os
import pandas as pd
from config import settings
from scrapers.data_scraper import fetch_all_raw_products
from filters.data_filter import filter_and_shortlist_products
from ai.ai_generator import enhance_product_with_ai
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

        # 3. AI Enhance
        logger.info(f"Enhancing {shortlisted_count} products with Gemini AI...")
        enhanced_products = []
        for _, row in shortlisted_df.iterrows():
            ai_content = enhance_product_with_ai(row)
            if ai_content:
                data = row.to_dict()
                data.update(ai_content)
                enhanced_products.append(data)
        
        # 4. Publish
        if enhanced_products:
            final_df = pd.DataFrame(enhanced_products)
            publish_products_to_db(final_df)
            log_pipeline_run("INFO", fetched_count, shortlisted_count, len(enhanced_products), "Success")
            logger.info("Pipeline completed successfully!")
        else:
            logger.error("AI enhancement failed.")

    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        log_pipeline_run("ERROR", 0, 0, 0, str(e))

if __name__ == "__main__":
    run_pipeline()
