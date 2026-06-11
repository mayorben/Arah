import io
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.security import get_current_admin
from models.invoice import Invoice

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", dependencies=[Depends(get_current_admin)])
async def list_invoices(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Invoice).order_by(Invoice.created_at.desc()))
    return [
        {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "order_number": inv.order.order_number if inv.order else "",
            "status": inv.status,
            "pdf_object_key": inv.pdf_object_key,
            "whatsapp_sent": inv.whatsapp_sent,
            "created_at": inv.created_at.isoformat(),
        }
        for inv in result.scalars()
    ]


@router.get("/{invoice_id}/download-url", dependencies=[Depends(get_current_admin)])
async def get_download_url(invoice_id: str, db: AsyncSession = Depends(get_db)):
    inv = await db.get(Invoice, uuid.UUID(invoice_id))
    if not inv or not inv.pdf_object_key:
        raise HTTPException(404, "Invoice PDF not found")
    from services.storage_client import get_public_url
    from core.config import get_settings
    settings = get_settings()
    url = get_public_url(settings.storage_bucket_invoices, inv.pdf_object_key)
    return {"url": url}


@router.get("/{invoice_id}/pdf")
async def stream_pdf(invoice_id: str, db: AsyncSession = Depends(get_db)):
    """Public endpoint — streams the invoice PDF directly from MinIO."""
    try:
        inv = await db.get(Invoice, uuid.UUID(invoice_id))
    except ValueError:
        raise HTTPException(404, "Invoice not found")
    if not inv or not inv.pdf_object_key:
        raise HTTPException(404, "PDF not ready yet")
    from services.storage_client import get_object_bytes
    from core.config import get_settings
    settings = get_settings()
    try:
        data = get_object_bytes(settings.storage_bucket_invoices, inv.pdf_object_key)
    except Exception:
        raise HTTPException(404, "PDF not available")
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={inv.invoice_number}.pdf"},
    )


@router.post("/{invoice_id}/resend", dependencies=[Depends(get_current_admin)])
async def resend_invoice(invoice_id: str, db: AsyncSession = Depends(get_db)):
    inv = await db.get(Invoice, uuid.UUID(invoice_id))
    if not inv:
        raise HTTPException(404, "Invoice not found")
    from tasks.invoice_tasks import generate_and_send_invoice
    generate_and_send_invoice.delay(str(inv.id))
    return {"ok": True, "message": "Invoice regeneration queued"}
