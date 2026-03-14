import os
import logging
from pathlib import Path
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

PIPELINE_DIR = Path(__file__).resolve().parent
ENV_FILE = PIPELINE_DIR / ".env"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
else:
    print(f"CRITICAL: .env file not found at {ENV_FILE}")

class Settings(BaseSettings):
    # Database
    db_sqlalchemy_uri: str = Field(..., validation_alias="DB_SQLALCHEMY_URI")
    
    # AI
    gemini_api_key: SecretStr = Field(..., validation_alias="GEMINI_API_KEY")
    generation_model: str = "gemini-pro"
    
    # App & Pipeline
    log_level: str = "INFO"
    log_file: str = "pipeline.log"
    run_mode: str = "MOCK"
    tenant_id: int = 1
    mock_api_url: str = Field("https://fakestoreapi.com/products", env="MOCK_API_URL")

    # Filter Settings
    min_rating: float = 3.5
    price_min_usd: float = 10.0
    price_max_usd: float = 500.0
    max_shortlist: int = 10
    include_categories: list[str] = ["electronics", "jewelery", "men's clothing", "women's clothing"]

    model_config = SettingsConfigDict(
        extra='ignore',
        case_sensitive=False
    )

try:
    settings = Settings()
except Exception as e:
    logging.error(f"Configuration Error: {e}")
    raise

def get_db_uri():
    uri = settings.db_sqlalchemy_uri
    if uri.startswith("postgresql://"):
        return uri.replace("postgresql://", "postgresql+psycopg2://", 1)
    return uri
