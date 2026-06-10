import logging
from datetime import datetime, timezone
from tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.invoice_tasks.generate_and_send_invoice", bind=True, max_retries=3)
def generate_and_send_invoice(self, invoice_id: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from models.invoice import Invoice
    from models.order import Order
    from models.customer import Customer
    from services.invoice_pdf import render_invoice
    from services.minio_client import upload_bytes, get_presigned_url, ensure_buckets
    from services.whatsapp_client import send_document_link, send_text
    from core.config import get_settings

    settings = get_settings()

    try:
        engine = create_engine(settings.sync_database_url)
        with Session(engine) as db:
            invoice = db.get(Invoice, invoice_id)
            if not invoice:
                logger.error("Invoice %s not found", invoice_id)
                return

            order = db.get(Order, str(invoice.order_id))
            customer = db.get(Customer, str(order.customer_id))

            # Render PDF
            pdf_bytes = render_invoice(invoice, order, customer)
            year = datetime.now(timezone.utc).strftime("%Y")
            month = datetime.now(timezone.utc).strftime("%m")
            key = f"{year}/{month}/{invoice.invoice_number}.pdf"

            # Upload to MinIO
            ensure_buckets()
            upload_bytes(settings.minio_bucket_invoices, key, pdf_bytes, "application/pdf")
            pdf_url = get_presigned_url(settings.minio_bucket_invoices, key, expires_days=7)

            # Update invoice record
            invoice.pdf_object_key = key
            invoice.pdf_size_bytes = len(pdf_bytes)
            invoice.status = "sent"
            db.commit()

            # Send via WhatsApp if customer has a WhatsApp ID
            if customer.whatsapp_id:
                send_document_link(
                    to=customer.whatsapp_id,
                    url=pdf_url,
                    caption=f"Your invoice for order {order.order_number} from {settings.business_name}. Total: ₦{order.total_amount:,.2f}",
                    filename=f"{invoice.invoice_number}.pdf",
                )
                invoice.whatsapp_sent = True
                invoice.whatsapp_sent_at = datetime.now(timezone.utc)
                db.commit()

            logger.info("Invoice %s generated and sent", invoice.invoice_number)

    except Exception as exc:
        logger.error("Invoice task failed: %s", exc)
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
