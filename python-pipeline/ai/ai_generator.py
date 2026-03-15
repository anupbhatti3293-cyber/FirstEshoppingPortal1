"""
AI product enhancement using Gemini. Uses google.generativeai (google-generativeai package).
API key from settings.gemini_api_key — never hardcoded.
"""
import logging
import json
import pandas as pd
import google.generativeai as genai
from config import settings

logger = logging.getLogger(__name__)


def enhance_product_with_ai(product_row: pd.Series) -> dict | None:
    """
    Enhances a single product with an AI-generated title and description using Gemini AI.
    """
    product_title = product_row.get("title", "No Title")
    logger.info("Enhancing product: %s", product_title)

    try:
        api_key = settings.gemini_api_key.get_secret_value()
        if not api_key:
            logger.error("Gemini API key is not configured.")
            return None

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(settings.generation_model or "gemini-2.5-flash")

        prompt = f"""
You are a world-class e-commerce copywriter.
Based on the following raw product data, generate a compelling, SEO-friendly product title and description.

The output must be a single, valid JSON object with two keys: "ai_title" and "ai_description".
Do not include any other text or formatting.

Raw Data:
- Title: {product_row.get('title')}
- Category: {product_row.get('category')}
- Description: {product_row.get('description')}
"""

        response = model.generate_content(prompt)
        output_text = (response.text or "").strip().replace("```json", "").replace("```", "").strip()
        ai_content = json.loads(output_text)

        logger.info("Successfully generated AI content for '%s'.", product_title)
        return ai_content

    except Exception as e:
        logger.error("Failed to enhance product '%s' with AI. Error: %s", product_title, e, exc_info=True)
        return None