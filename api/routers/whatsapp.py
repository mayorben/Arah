from fastapi import APIRouter, Request, Response, HTTPException
from core.config import get_settings

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])
settings = get_settings()


@router.get("/webhook")
async def verify_webhook(request: Request):
    params = dict(request.query_params)
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == settings.whatsapp_verify_token:
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Webhook verification failed")


@router.post("/webhook")
async def receive_webhook(request: Request):
    import json
    raw_body = await request.body()

    # Reject requests that don't carry a valid Meta signature.
    # Skip only when WHATSAPP_APP_SECRET is not yet configured (local dev).
    if settings.whatsapp_app_secret:
        signature = request.headers.get("X-Hub-Signature-256", "")
        from services.whatsapp_client import verify_signature
        if not verify_signature(raw_body, signature, settings.whatsapp_app_secret):
            raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        body = json.loads(raw_body)
        entry = body.get("entry", [])
        if entry:
            changes = entry[0].get("changes", [])
            if changes:
                value = changes[0].get("value", {})
                if value.get("messages"):
                    from tasks.whatsapp_tasks import process_whatsapp_event
                    process_whatsapp_event.delay({"value": value})
    except Exception:
        pass

    return Response(content="EVENT_RECEIVED", media_type="text/plain")
