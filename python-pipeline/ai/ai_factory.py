"""
Phase 2.5: Pluggable AI Orchestration Layer — integrated with enhance_product_with_ai.
Uses AIProviderFactory + AIOrchestrator for pipeline and automation flows.
"""

import logging
from abc import ABC, abstractmethod
import pandas as pd

from ai.ai_generator import enhance_product_with_ai
from config import settings, get_db_uri

logger = logging.getLogger(__name__)


def _get_selected_model(store_id: int) -> str:
    """Fetch selected AI model for store from DB. Fallback to settings."""
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(get_db_uri())
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT selected_model FROM automation_rules WHERE tenant_id = :sid"),
                {"sid": store_id},
            ).fetchone()
        return (row[0] or "gemini").lower() if row else (settings.generation_model or "gemini").split("-")[0]
    except Exception as e:
        logger.warning("Could not fetch selected_model from DB: %s", e)
        return (settings.generation_model or "gemini").split("-")[0]


def _normalize_product_row(product_row: pd.Series) -> pd.Series:
    """Map supplier_products keys (raw_title, etc.) to ai_generator keys (title, etc.)."""
    row = product_row.copy()
    if not row.get("title") or (isinstance(row.get("title"), float) and pd.isna(row.get("title"))):
        if row.get("raw_title"):
            row["title"] = row["raw_title"]
    if not row.get("category") or (isinstance(row.get("category"), float) and pd.isna(row.get("category"))):
        if row.get("supplier_category"):
            row["category"] = row["supplier_category"]
    if not row.get("description") or (isinstance(row.get("description"), float) and pd.isna(row.get("description"))):
        if row.get("raw_description"):
            row["description"] = row["raw_description"]
    return row


# --- Abstract Base Class ---


class BaseAIProvider(ABC):
    @abstractmethod
    def analyze_product(self, product_row: pd.Series) -> dict:
        """Returns dict with ai_title, ai_description, market_sentiment."""
        pass


# --- Gemini Provider (uses enhance_product_with_ai) ---


class GeminiProvider(BaseAIProvider):
    def analyze_product(self, product_row: pd.Series) -> dict:
        normalized = _normalize_product_row(product_row)
        ai_result = enhance_product_with_ai(normalized)
        if not ai_result:
            return {"ai_title": None, "ai_description": None, "market_sentiment": 0}

        desc = ai_result.get("ai_description", "") or ""
        market_sentiment = min(len(desc) / 50, 10)

        return {
            "ai_title": ai_result.get("ai_title"),
            "ai_description": ai_result.get("ai_description"),
            "market_sentiment": market_sentiment,
        }


# --- AI Provider Factory ---


class AIProviderFactory:
    @staticmethod
    def get_provider(model_name: str) -> BaseAIProvider:
        name = (model_name or "gemini").lower()
        if name == "gemini":
            return GeminiProvider()
        raise ValueError(f"Unsupported AI model: {model_name}")


# --- AI Orchestrator ---


class AIOrchestrator:
    def __init__(self, store_id: int):
        self.store_id = store_id
        self.model_name = _get_selected_model(store_id)
        self.provider = AIProviderFactory.get_provider(self.model_name)

    def calculate_math_score(
        self,
        estimated_margin_pct: float,
        shipping_days_us: float,
        supplier_rating: float,
    ) -> float:
        margin_score = max(0, (estimated_margin_pct - 25) * 1.33)
        if shipping_days_us > 12:
            shipping_score = 0
        else:
            shipping_score = ((12 - shipping_days_us) / 12) * 100
        rating_score = ((supplier_rating / 5) ** 2) * 100
        math_score = (0.5 * margin_score) + (0.3 * shipping_score) + (0.2 * rating_score)
        return round(math_score, 2)

    def evaluate_product(self, product_row: pd.Series) -> dict:
        margin = float(product_row.get("estimated_margin_pct", 0) or 0)
        shipping = float(product_row.get("shipping_days_us", 0) or 0)
        rating_raw = product_row.get("supplier_rating") or product_row.get("raw_rating", 0)
        if isinstance(rating_raw, dict):
            rating_raw = rating_raw.get("rate", 0) or 0
        rating = float(rating_raw) if rating_raw else 0

        math_score = self.calculate_math_score(margin, shipping, rating)

        try:
            ai_result = self.provider.analyze_product(product_row)
            market_score = ai_result.get("market_sentiment", 0)
        except Exception as e:
            logger.error("AI Provider failed: %s, falling back to math score only", e)
            ai_result = {"ai_title": None, "ai_description": None}
            market_score = 0

        final_score = round((0.7 * math_score) + (0.3 * market_score * 10), 2)

        return {
            "ai_title": ai_result.get("ai_title"),
            "ai_description": ai_result.get("ai_description"),
            "math_score": math_score,
            "market_score": market_score,
            "final_score": final_score,
        }


# --- Standalone helpers (for api/ai_factory.py and evaluate route) ---


def calculate_math_score(
    estimated_margin_pct: float,
    shipping_days_us: float,
    supplier_rating: float,
) -> float:
    """Architect-approved math score. Used by api/ai_factory.ai_orchestrator."""
    o = AIOrchestrator(store_id=1)
    return o.calculate_math_score(estimated_margin_pct, shipping_days_us, supplier_rating)
