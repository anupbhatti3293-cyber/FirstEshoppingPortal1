"""SQLAlchemy model for automation_rules table."""
from sqlalchemy import Column, Integer, Numeric, Boolean, DateTime, ForeignKey, String
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class AutomationRules(Base):
    __tablename__ = "automation_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, nullable=False, unique=True)
    selected_model = Column(String(50), default="gemini")
    min_ai_profit_score = Column(Integer, default=85)
    min_margin_pct = Column(Numeric(10, 2), default=40.00)
    max_shipping_days = Column(Integer, default=10)
    min_supplier_rating = Column(Numeric(3, 2), default=4.50)
    auto_publish_enabled = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
