import logging
import json
import pandas as pd
import google.generativeai as genai
from config import settings

logger = logging.getLogger(__name__)

def enhance_product_with_ai(product_row: pd.Series) -> dict | None:
    """
    Enhances a single product with an AI-generated title and description.
    """
    product_title = product_row.get('title', 'No Title')
    logger.info(f"Enhancing product: {product_title}")

    try:
        # Get the API key from our flat settings object
        api_key = settings.gemini_api_key.get_secret_value()
        if not api_key:
            logger.error("Gemini API key is not configured.")
            return None
        
        genai.configure(api_key=api_key)
        
        # Use the model name from our config file
        model = genai.GenerativeModel(settings.generation_model)

        prompt = f"""
        You are a world-class e-commerce copywriter.
        Based on the following raw product data, generate a compelling, SEO-friendly product title and description.
        
        The output must be a single, valid JSON object with two keys: "ai_title" and "ai_description". Do not include any other text or formatting.

        Raw Data:
        - Title: {product_row.get('title')}
        - Category: {product_row.get('category')}
        - Description: {product_row.get('description')}
        """

        response = model.generate_content(prompt)
        
        # Clean the response to extract only the JSON part
        json_text = response.text.strip().replace("```json", "").replace("```", "").strip()
        
        ai_content = json.loads(json_text)

        logger.info(f"Successfully generated AI content for '{product_title}'.")
        return ai_content

    except Exception as e:
        logger.error(f"Failed to enhance product '{product_title}' with AI. Error: {e}", exc_info=False)
        return None
