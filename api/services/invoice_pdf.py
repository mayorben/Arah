from datetime import datetime, timezone
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from core.config import get_settings

settings = get_settings()

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
_jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))


def _format_naira(amount: float) -> str:
    return f"₦{amount:,.2f}"


def render_invoice(invoice, order, customer) -> bytes:
    template = _jinja_env.get_template("invoice.html")
    items = []
    for item in order.items:
        items.append({
            "name": item.product_name,
            "unit": item.unit,
            "quantity": float(item.quantity),
            "unit_price": _format_naira(float(item.unit_price)),
            "line_total": _format_naira(float(item.line_total)),
        })

    ctx = {
        "invoice_number": invoice.invoice_number,
        "invoice_date": invoice.created_at.strftime("%d %B %Y"),
        "order_number": order.order_number,
        "customer_name": customer.full_name,
        "customer_phone": customer.phone,
        "customer_address": customer.delivery_address or "",
        "delivery_address": order.delivery_address or customer.delivery_address or "",
        "items": items,
        "subtotal": _format_naira(float(order.subtotal)),
        "discount": _format_naira(float(order.discount_amount)),
        "delivery_fee": _format_naira(float(order.delivery_fee)),
        "total": _format_naira(float(order.total_amount)),
        "payment_status": order.payment_status,
        "is_paid": order.payment_status == "paid",
        "business": {
            "name": settings.business_name,
            "phone": settings.business_phone,
            "email": settings.business_email,
            "address": settings.business_address,
            "bank_name": settings.bank_name,
            "account_number": settings.bank_account_number,
            "account_name": settings.bank_account_name,
        },
    }

    html_string = template.render(**ctx)
    return HTML(string=html_string, base_url=str(TEMPLATE_DIR)).write_pdf()
