import logging
import json
import pandas as pd
from sqlalchemy import create_engine, text
from config import settings, get_db_uri

logger = logging.getLogger(__name__)

def publish_products_to_db(final_df: pd.DataFrame):
    try:
        engine = create_engine(get_db_uri())
        table_name = "supplier_products"
        
        with engine.connect() as conn:
            for _, row in final_df.iterrows():
                external_id = str(row.get('id', 'MOCK_ID'))
                
                sql = text(f"""
                    INSERT INTO {table_name} 
                    (tenant_id, supplier_id, external_id, raw_title, raw_description, processing_status, raw_images, raw_rating)
                    VALUES 
                    (:tid, 1, :ext_id, :title, :desc, 'AI_PROCESSED', :images, :rating)
                    ON CONFLICT (tenant_id, supplier_id, external_id) DO NOTHING
                """)
                
                conn.execute(sql, {
                    "tid": settings.tenant_id,
                    "ext_id": external_id,
                    "title": row.get('ai_title', row.get('title')),
                    "desc": row.get('ai_description', row.get('description')),
                    "images": json.dumps([row.get('thumbnail', '')]),
                    "rating": row.get('rating', 0)
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
