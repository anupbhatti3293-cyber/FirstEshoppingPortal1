import logging
import pandas as pd
from typing import List, Dict, Any
from config import settings

logger = logging.getLogger(__name__)

def filter_and_shortlist_products(products: List[Dict[str, Any]]) -> pd.DataFrame:
    logger.info("Starting product filtering and shortlisting process...")
    if not products:
        logger.warning("Product list is empty, skipping filtering.")
        return pd.DataFrame()

    df = pd.DataFrame(products)
    logger.info(f"Initial product count: {len(df)}")

    # Ensure required columns exist
    for col in ['price', 'category', 'rating']:
        if col not in df.columns:
            logger.error(f"Missing required column '{col}' in product data. Skipping filtering.")
            return pd.DataFrame()
            
    # Safely extract rating value, handling dict format {rate: 3.9, count: 120}
    df['rating_value'] = df['rating'].apply(lambda x: x.get('rate', 0) if isinstance(x, dict) else x)

    # --- Apply Filters using new flat settings ---
    df_filtered = df[
        (df['price'] >= settings.price_min_usd) &
        (df['price'] <= settings.price_max_usd) &
        (df['rating_value'] >= settings.min_rating) &
        (df['category'].isin(settings.include_categories))
    ].copy()
    
    logger.info(f"Products after filtering: {len(df_filtered)}")

    if df_filtered.empty:
        logger.warning("No products left after filtering.")
        return pd.DataFrame()

    # --- Shortlist ---
    # Sort by a composite score (e.g., rating), and take the top N
    final_shortlist = df_filtered.sort_values(by='rating_value', ascending=False).head(settings.max_shortlist)
    
    logger.info(f"Final shortlist count: {len(final_shortlist)}")
    return final_shortlist
