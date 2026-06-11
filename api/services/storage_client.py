"""
Supabase Storage client — replaces MinIO for cloud deployments.
Same interface as the old minio_client so all callers work unchanged.
"""
import logging
from supabase import create_client, Client
from core.config import get_settings

logger = logging.getLogger(__name__)
_client: Client | None = None


def _get() -> Client:
    global _client
    if _client is None:
        s = get_settings()
        _client = create_client(s.supabase_url, s.supabase_service_key)
    return _client


def ensure_buckets():
    s = get_settings()
    client = _get()
    for bucket in [s.storage_bucket_invoices, s.storage_bucket_products]:
        try:
            client.storage.create_bucket(bucket, options={"public": True})
        except Exception:
            pass  # already exists


def upload_bytes(bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    _get().storage.from_(bucket).upload(
        path=key,
        file=data,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    return key


def get_public_url(bucket: str, key: str) -> str:
    return _get().storage.from_(bucket).get_public_url(key)


def get_object_bytes(bucket: str, key: str) -> bytes:
    return _get().storage.from_(bucket).download(key)
