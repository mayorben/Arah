import io
from datetime import timedelta
from minio import Minio
from minio.error import S3Error
from core.config import get_settings

settings = get_settings()

_client: Minio | None = None


def get_minio() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_root_user,
            secret_key=settings.minio_root_password,
            secure=False,
        )
    return _client


def ensure_buckets():
    client = get_minio()
    for bucket in [settings.minio_bucket_invoices, settings.minio_bucket_products]:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)


def upload_bytes(bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    client = get_minio()
    client.put_object(bucket, key, io.BytesIO(data), len(data), content_type=content_type)
    return key


def get_presigned_url(bucket: str, key: str, expires_days: int = 7) -> str:
    client = get_minio()
    url = client.presigned_get_object(bucket, key, expires=timedelta(days=expires_days))
    internal = f"http://{settings.minio_endpoint}"
    public = settings.minio_public_url.rstrip("/")
    return url.replace(internal, public, 1)


def get_object_bytes(bucket: str, key: str) -> bytes:
    client = get_minio()
    response = client.get_object(bucket, key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def get_public_url(bucket: str, key: str) -> str:
    return f"{settings.minio_public_url}/{bucket}/{key}"
