import logging
import json
import pandas as pd
from sqlalchemy import create_engine, text
from config import settings, get_db_uri

logger = logging.getLogger(__name__)

def _extract_rating(rating) -> float:
    """Extract numeric rating from API response (handles {rate: x, count: y} format)."""
    if isinstance(rating, (int, float)):
        return float(rating)
    if isinstance(rating, dict):
        return float(rating.get("rate", 0) or 0)
    return 0.0


def publish_products_to_db(final_df: pd.DataFrame):
    try:
        engine = create_engine(get_db_uri())
        table_name = "supplier_products"
        
        with engine.connect() as conn:
            for _, row in final_df.iterrows():
                external_id = str(row.get('id', 'MOCK_ID'))
                
                cost = float(row.get('price', 0) or 0)
                rating = _extract_rating(row.get('rating', 0))
                margin_pct = 40.0
                retail = cost * (1 + margin_pct / 100) if cost > 0 else 29.99
                profit_score = min(100, int(rating * 20)) if rating else 50

                category = str(row.get('category', '')) or None

                sql = text(f"""
                    INSERT INTO {table_name} 
                    (tenant_id, supplier_id, external_id, raw_title, raw_description, processing_status, raw_images, raw_rating, supplier_price_usd, suggested_retail_price_usd, estimated_margin_pct, ai_profit_score, shipping_days_us, supplier_category)
                    VALUES 
                    (:tid, 1, :ext_id, :title, :desc, 'AI_PROCESSED', :images, :rating, :cost, :retail, :margin, :score, 14, :cat)
                    ON CONFLICT (tenant_id, supplier_id, external_id) DO UPDATE SET
                    raw_title = EXCLUDED.raw_title, raw_description = EXCLUDED.raw_description, raw_images = EXCLUDED.raw_images,
                    raw_rating = EXCLUDED.raw_rating, supplier_price_usd = EXCLUDED.supplier_price_usd,
                    suggested_retail_price_usd = EXCLUDED.suggested_retail_price_usd, estimated_margin_pct = EXCLUDED.estimated_margin_pct,
                    ai_profit_score = EXCLUDED.ai_profit_score, supplier_category = EXCLUDED.supplier_category, processing_status = 'AI_PROCESSED'
                """)

                conn.execute(sql, {
                    "tid": settings.tenant_id,
                    "ext_id": external_id,
                    "title": row.get('ai_title', row.get('title')),
                    "desc": row.get('ai_description', row.get('description')),
                    "images": json.dumps([row.get('thumbnail', row.get('image', ''))]),
                    "rating": rating,
                    "cost": cost,
                    "retail": round(retail, 2),
                    "margin": margin_pct,
                    "score": profit_score,
                    "cat": category,
                })
            conn.commit()
        logger.info(f"Successfully staged {len(final_df)} products.")
    except Exception as e:
        logger.error(f"Database Error: {e}")

def log_pipeline_run(status, fetched, shortlisted, published, notes):
    try:
        engine = create_engine(get_db_uri())
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO automation_logs (tenant_id, level, action, message)
                VALUES (:tid, :lvl, 'PIPELINE_RUN', :msg)
            """), {
                "tid": settings.tenant_id,
                "lvl": status,
                "msg": f"Run complete. Fetched: {fetched}, Published: {published}. {notes}"
            })
            conn.commit()
    except Exception as e:
        print(f"Log Error: {e}")
