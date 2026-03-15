import os
import logging
from pathlib import Path
from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

PIPELINE_DIR = Path(__file__).resolve().parent
ENV_FILE = PIPELINE_DIR / ".env"
PROJECT_ROOT = PIPELINE_DIR.parent

# Load project root first, then pipeline .env (pipeline overrides so DB_SQLALCHEMY_URI wins)
load_dotenv(PROJECT_ROOT / ".env")
if ENV_FILE.exists():
    load_dotenv(ENV_FILE, override=True)  # Pipeline .env overrides for DB_SQLALCHEMY_URI

class Settings(BaseSettings):
    # Database (supports both pipeline and Next.js env var names)
    db_sqlalchemy_uri: str = Field(
        ...,
        validation_alias=AliasChoices("DB_SQLALCHEMY_URI", "SUPABASE_DB_POOLER_URL")
    )
    
    # AI
    gemini_api_key: SecretStr = Field(..., validation_alias="GEMINI_API_KEY")
    generation_model: str = Field("gemini-2.5-flash", validation_alias="GEMINI_MODEL")
    
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
        case_sensitive=False,
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        env_file_encoding='utf-8',
    )

try:
    settings = Settings()
except Exception as e:
    logging.error(f"Configuration Error: {e}")
    raise

def get_db_uri():
    """Build SQLAlchemy URI with psycopg2 driver. Handles passwords containing #, @, etc."""
    from urllib.parse import quote, unquote

    uri = settings.db_sqlalchemy_uri.strip()
    # Ensure psycopg2 driver
    if "postgres" in uri and "+psycopg2" not in uri:
        uri = uri.replace("postgresql://", "postgresql+psycopg2://", 1).replace(
            "postgres://", "postgresql+psycopg2://", 1
        )

    # Fix parsing when password contains # or @ (splits host incorrectly)
    # Format: postgres://user:password@host:port/db?query
    # Split from RIGHT: last @ separates user:password from host:port/path
    if "://" in uri and "@" in uri:
        scheme, rest = uri.split("://", 1)
        parts = rest.rsplit("@", 1)  # rsplit so password can contain @
        if len(parts) == 2:
            auth_part, host_part = parts[0], parts[1]  # user:password, host:port/path?query
            if ":" in auth_part:
                user, _, password = auth_part.partition(":")
                # Decode if pre-encoded, then encode so #, @, %, etc. don't break the URI
                password_encoded = quote(unquote(password), safe="")
                uri = f"{scheme}://{user}:{password_encoded}@{host_part}"

    return uri
