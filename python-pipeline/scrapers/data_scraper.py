import logging
from typing import List, Dict, Any
from config import settings
from .clients.mock_client import get_mock_products

logger = logging.getLogger(__name__)

def fetch_all_raw_products() -> List[Dict[str, Any]]:
    # Use settings.run_mode (flat structure)
    run_mode = settings.run_mode
    logger.info(f"Starting data fetching in {run_mode} mode.")

    all_products = []
    try:
        if run_mode == 'MOCK':
            all_products = get_mock_products()
        else:
            logger.warning("LIVE mode not implemented. Using MOCK.")
            all_products = get_mock_products()

    except Exception as e:
        logger.error(f"Error during fetching: {e}")
        return []

    logger.info(f"Fetched {len(all_products)} raw products.")
    return all_products
