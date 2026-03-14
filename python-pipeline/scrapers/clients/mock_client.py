import logging
import requests
from typing import List, Dict, Any
from config import settings

logger = logging.getLogger(__name__)

def get_mock_products() -> List[Dict[str, Any]]:
    """
    Fetches product data from the fakestoreapi.com mock endpoint.
    """
    # Use the new 'flat' settings structure
    url = settings.mock_api_url 
    logger.info(f"Fetching mock data from URL: {url}")
    
    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        products = response.json()
        
        # The API returns a list of dictionaries, which is what we want.
        # Let's add a quick validation to ensure it's a list.
        if isinstance(products, list):
            logger.info(f"Successfully fetched {len(products)} mock products.")
            return products
        else:
            logger.error(f"Mock API did not return a list. Data received: {products}")
            return []

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch data from mock API: {e}", exc_info=True)
        return []
    except Exception as e:
        logger.error(f"An unexpected error occurred in get_mock_products: {e}", exc_info=True)
        return []
