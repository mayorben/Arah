import hashlib
import hmac
import httpx
from core.config import get_settings

settings = get_settings()

WHATSAPP_API_BASE = "https://graph.facebook.com"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.whatsapp_access_token}",
        "Content-Type": "application/json",
    }


def _url(path: str) -> str:
    return f"{WHATSAPP_API_BASE}/{settings.whatsapp_api_version}/{settings.whatsapp_phone_number_id}{path}"


def send_text(to: str, message: str) -> dict:
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": message},
    }
    with httpx.Client() as client:
        resp = client.post(_url("/messages"), headers=_headers(), json=payload, timeout=15)
        resp.raise_for_status()
        return resp.json()


def send_document_link(to: str, url: str, caption: str, filename: str) -> dict:
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "document",
        "document": {"link": url, "caption": caption, "filename": filename},
    }
    with httpx.Client() as client:
        resp = client.post(_url("/messages"), headers=_headers(), json=payload, timeout=15)
        resp.raise_for_status()
        return resp.json()


def verify_signature(payload_bytes: bytes, signature_header: str, app_secret: str) -> bool:
    expected = "sha256=" + hmac.new(app_secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)
