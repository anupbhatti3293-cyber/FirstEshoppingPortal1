"""
Phase 2.5: Pluggable AI Orchestration Layer with Enterprise Math Logic.
Multi-tenant: all queries filter by store_id.
"""

from __future__ import annotations

import logging
import os
import sys
from abc import ABC, abstractmethod
from pathlib import Path

# Add python-pipeline for config and DB
_sys_path = Path(__file__).resolve().parents[1] / "python-pipeline"
if str(_sys_path) not in sys.path:
    sys.path.insert(0, str(_sys_path))

from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)


def _get_db_uri() -> str:
    """Resolve DB URI from env (compatible with pipeline config)."""
    from config import get_db_uri
    return get_db_uri()


def get_selected_model(store_id: int) -> str:
    """Fetch selected AI model for store. Multi-tenant: filter by store_id."""
    engine = create_engine(_get_db_uri())
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT selected_model FROM automation_rules WHERE tenant_id = :sid"),
            {"sid": store_id},
        ).fetchone()
    return (row[0] or "gemini").lower() if row else "gemini"


def get_active_api_key(store_id: int, provider_name: str) -> str | None:
    """Fetch active API key for store and provider. Multi-tenant: filter by store_id."""
    engine = create_engine(_get_db_uri())
    with engine.connect() as conn:
        row = conn.execute(
            text("""
                SELECT encrypted_api_key FROM ai_credentials
                WHERE store_id = :sid AND provider_name = :provider AND is_active = TRUE
            """),
            {"sid": store_id, "provider": provider_name},
        ).fetchone()
    if not row or not row[0]:
        return None
    # Decrypt if encryption key is configured; otherwise assume plain text (dev)
    return _decrypt_api_key(row[0])


def _decrypt_api_key(encrypted: str) -> str:
    """Decrypt API key. Falls back to plain text if no encryption key."""
    key = os.environ.get("AI_CREDENTIALS_ENCRYPTION_KEY")
    if not key:
        return encrypted
    try:
        from cryptography.fernet import Fernet
        f = Fernet(key.encode() if isinstance(key, str) else key)
        return f.decrypt(encrypted.encode()).decode()
    except Exception as e:
        logger.warning("API key decryption failed, using as plain: %s", e)
        return encrypted


def encrypt_api_key(plain: str) -> str:
    """Encrypt API key for storage. Returns plain if no encryption key."""
    key = os.environ.get("AI_CREDENTIALS_ENCRYPTION_KEY")
    if not key:
        return plain
    try:
        from cryptography.fernet import Fernet
        f = Fernet(key.encode() if isinstance(key, str) else key)
        return f.encrypt(plain.encode()).decode()
    except Exception as e:
        logger.warning("API key encryption failed: %s", e)
        return plain


# --- Enterprise-Grade Math Score (Architect-Approved) ---


def calculate_math_score(
    estimated_margin_pct: float,
    shipping_days_us: int | float,
    supplier_rating: float,
) -> float:
    """
    Compute deterministic math score from margin, shipping, and rating.
    - Margin: Penalize low-margin products (<25%)
    - Shipping: Kill switch for slow shipping (>12 days)
    - Rating: Exponential weighting to favor top-tier suppliers
    """
    # Margin Score: Penalize low-margin products (<25%)
    margin_score = max(0, (estimated_margin_pct - 25) * 1.33)

    # Shipping Score: Kill switch for slow shipping (>12 days)
    if shipping_days_us > 12:
        shipping_score = 0.0
    else:
        shipping_score = ((12 - shipping_days_us) / 12) * 100

    # Rating Score: Exponential weighting to favor top-tier suppliers
    rating_score = ((supplier_rating / 5) ** 2) * 100

    # Final Weights: 50% Margin, 30% Shipping, 20% Rating
    math_score = (0.5 * margin_score) + (0.3 * shipping_score) + (0.2 * rating_score)
    return round(math_score, 2)


# --- AI Provider Abstraction ---


class BaseAIProvider(ABC):
    @abstractmethod
    def analyze_product(self, product_data: dict) -> float:
        """Returns Market Appeal Score (0-10)."""
        pass


class GeminiProvider(BaseAIProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key

    def analyze_product(self, product_data: dict) -> float:
        """Call Gemini LLM API; return market appeal 0-10."""
        import google.generativeai as genai

        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        title = product_data.get("raw_title", product_data.get("title", "Unknown"))
        desc = product_data.get("raw_description", product_data.get("description", ""))
        category = product_data.get("supplier_category", product_data.get("category", ""))
        margin = product_data.get("estimated_margin_pct", 0)
        shipping = product_data.get("shipping_days_us", 0)
        rating = product_data.get("supplier_rating", product_data.get("raw_rating", 0))

        if isinstance(rating, dict):
            rating = rating.get("rate", 0) or 0
        rating = float(rating) if rating else 0

        prompt = f"""
You are an e-commerce market analyst. Rate the market appeal of this product on a scale of 0 to 10.
Consider: title clarity, category fit, margin potential, shipping speed, and supplier reputation.

Product:
- Title: {title}
- Category: {category}
- Description: {desc[:300] if desc else "N/A"}
- Margin: {margin}%
- Shipping: {shipping} days
- Supplier Rating: {rating}/5

Respond with ONLY a single number between 0 and 10 (e.g. 7.5). No other text.
"""

        try:
            response = model.generate_content(prompt)
            text_val = (response.text or "").strip().replace(",", ".")
            score = float(text_val)
            return max(0, min(10, score))
        except Exception as e:
            logger.warning("Gemini analyze_product failed: %s", e)
            return 0.0


class AIProviderFactory:
    @staticmethod
    def get_provider(model_name: str, api_key: str) -> BaseAIProvider:
        name = (model_name or "gemini").lower()
        if name == "gemini":
            return GeminiProvider(api_key)
        # Add more providers here (gpt-4, claude, etc.)
        raise ValueError(f"Unknown AI provider: {model_name}")


# --- AI Orchestrator ---


def ai_orchestrator(product_data: dict, store_id: int) -> float:
    """
    Compute final ai_profit_score:
    - 70% math score (margin, shipping, rating)
    - 30% AI market appeal score (0-100 scaled)
    """
    model_name = get_selected_model(store_id)
    credential = get_active_api_key(store_id, model_name)

    # 1. Math Score
    margin = float(product_data.get("estimated_margin_pct", 0) or 0)
    shipping = float(product_data.get("shipping_days_us", 999) or 999)
    rating_raw = product_data.get("supplier_rating") or product_data.get("raw_rating", 0)
    if isinstance(rating_raw, dict):
        rating_raw = rating_raw.get("rate", 0) or 0
    rating = float(rating_raw) if rating_raw else 0

    math_score = calculate_math_score(margin, shipping, rating)

    # 2. AI Market Appeal Score (0-10 → 0-100)
    market_appeal_scaled = 0.0
    if credential:
        try:
            provider = AIProviderFactory.get_provider(model_name, credential)
            market_appeal_score = provider.analyze_product(product_data)
            market_appeal_scaled = market_appeal_score * 10
        except Exception as e:
            logger.warning("AI provider failed for store %s: %s", store_id, e)

    # 3. Final ai_profit_score
    ai_profit_score = round(0.7 * math_score + 0.3 * market_appeal_scaled, 2)
    return ai_profit_score
