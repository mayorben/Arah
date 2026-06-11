import hmac
import hashlib
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import httpx

from core.database import get_db
from core.config import get_settings
from models.order import Order
from models.invoice import Invoice

router = APIRouter(prefix="/payments", tags=["payments"])

PAYSTACK_BASE = "https://api.paystack.co"


class VerifyRequest(BaseModel):
    reference: str
    order_number: str


async def _paystack_verify(reference: str, secret_key: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{PAYSTACK_BASE}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {secret_key}"},
        )
    if r.status_code != 200:
        raise HTTPException(400, "Paystack verification request failed")
    return r.json()


async def _mark_order_paid(order: Order, reference: str, db: AsyncSession) -> None:
    order.payment_status = "paid"
    order.payment_ref = reference
    order.payment_method = "paystack"
    order.status = "confirmed"
    order.paid_at = datetime.now(timezone.utc)
    await db.commit()

    # Trigger invoice generation (best-effort)
    try:
        result = await db.execute(select(Invoice).where(Invoice.order_id == order.id))
        invoice = result.scalar_one_or_none()
        if invoice:
            from tasks.invoice_tasks import generate_and_send_invoice
            generate_and_send_invoice.delay(str(invoice.id))
    except Exception:
        pass


@router.post("/verify")
async def verify_payment(data: VerifyRequest, db: AsyncSession = Depends(get_db)):
    """
    Called by the frontend after the Paystack popup reports success.
    Verifies the reference with Paystack's API, then marks the order paid.
    """
    settings = get_settings()
    if not settings.paystack_secret_key:
        raise HTTPException(400, "Paystack is not configured on this server")

    result = await _paystack_verify(data.reference, settings.paystack_secret_key)

    if result.get("data", {}).get("status") != "success":
        raise HTTPException(400, f"Payment not successful: {result.get('data', {}).get('status')}")

    # Resolve order
    q = await db.execute(select(Order).where(Order.order_number == data.order_number))
    order = q.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")

    if order.payment_status == "paid":
        return {"status": "already_paid", "order_number": order.order_number}

    await _mark_order_paid(order, data.reference, db)

    return {"status": "success", "order_number": order.order_number}


@router.post("/webhook")
async def paystack_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Paystack webhook — backup confirmation if the browser callback is missed.
    Paystack sends this server-to-server on every successful charge.
    """
    body = await request.body()
    signature = request.headers.get("x-paystack-signature", "")
    settings = get_settings()

    # Verify HMAC-SHA512 signature
    if settings.paystack_secret_key:
        expected = hmac.new(
            settings.paystack_secret_key.encode("utf-8"),
            body,
            hashlib.sha512,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(400, "Invalid Paystack signature")

    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON body")

    if event.get("event") == "charge.success":
        charge_data = event["data"]
        reference   = charge_data.get("reference", "")
        meta        = charge_data.get("metadata") or {}
        order_number = meta.get("order_number") or reference

        q = await db.execute(select(Order).where(Order.order_number == order_number))
        order = q.scalar_one_or_none()

        if order and order.payment_status != "paid":
            await _mark_order_paid(order, reference, db)

    return {"status": "ok"}
