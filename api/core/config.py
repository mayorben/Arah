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

    # Admin credentials (single owner login)
    admin_username: str = "admin"
    admin_password: str = "changeme"

    # PostgreSQL
    postgres_host: str = "db"
    postgres_port: int = 5432
    postgres_db: str = "arah"
    postgres_user: str = "arah"
    postgres_password: str = "changeme"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def sync_database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # MinIO
    minio_endpoint: str = "minio:9000"
    minio_root_user: str = "minioadmin"
    minio_root_password: str = "changeme123"
    minio_bucket_invoices: str = "invoices"
    minio_bucket_products: str = "products"
    minio_public_url: str = "http://localhost/storage"

    # WhatsApp Cloud API
    whatsapp_phone_number_id: str = ""
    whatsapp_access_token: str = ""
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
