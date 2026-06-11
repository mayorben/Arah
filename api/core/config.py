from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "Arah Provisions"
    secret_key: str = "changeme-use-a-real-secret-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    environment: str = "development"
    base_url: str = "http://localhost"

    # Admin credentials
    admin_username: str = "admin"
    admin_password: str = "changeme"

    # PostgreSQL — set DATABASE_URL_OVERRIDE to a full Supabase pooler string,
    # or fill individual fields for a local postgres instance.
    database_url_override: str = ""
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "arah"
    postgres_user: str = "arah"
    postgres_password: str = "changeme"

    @property
    def database_url(self) -> str:
        url = self.database_url_override or (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
        # Normalise scheme — Render's built-in DB gives postgres:// or postgresql://
        if url.startswith("postgres://"):
            url = "postgresql+asyncpg://" + url[len("postgres://"):]
        elif url.startswith("postgresql://"):
            url = "postgresql+asyncpg://" + url[len("postgresql://"):]
        return url

    @property
    def sync_database_url(self) -> str:
        url = self.database_url_override or (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
        return (
            url
            .replace("postgresql+asyncpg://", "postgresql+psycopg2://")
            .replace("postgresql://", "postgresql+psycopg2://")
        )

    # Redis — Upstash gives a rediss:// URL; locally use redis://localhost:6379/0
    redis_url: str = "redis://localhost:6379/0"

    # Supabase Storage (replaces MinIO)
    supabase_url: str = ""
    supabase_service_key: str = ""
    storage_bucket_invoices: str = "invoices"
    storage_bucket_products: str = "products"

    # WhatsApp Cloud API
    whatsapp_phone_number_id: str = ""
    whatsapp_access_token: str = ""
    whatsapp_app_secret: str = ""      # Meta App → Settings → Basic → App Secret
    whatsapp_verify_token: str = "arah_verify_token"
    whatsapp_api_version: str = "v21.0"
    owner_whatsapp_number: str = ""

    # Business details for invoices
    business_name: str = "Arah Provisions"
    business_phone: str = ""
    business_email: str = ""
    business_address: str = "Lagos, Nigeria"
    bank_name: str = ""
    bank_account_number: str = ""
    bank_account_name: str = ""

    # Low stock
    default_low_stock_threshold: int = 10


@lru_cache
def get_settings() -> Settings:
    return Settings()
