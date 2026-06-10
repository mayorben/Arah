import logging
import time
from tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.alert_tasks.check_low_stock_and_notify")
def check_low_stock_and_notify():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from models.product import Product
    from services.whatsapp_client import send_text
    from core.config import get_settings

    settings = get_settings()
    if not settings.owner_whatsapp_number:
        return

    engine = create_engine(settings.sync_database_url)
    with Session(engine) as db:
        low = db.query(Product).filter(
            Product.is_active == True,
            Product.stock_quantity <= Product.low_stock_threshold,
        ).all()

        if not low:
            return

        lines = ["⚠️ *Low Stock Alert — Arah Provisions*\n"]
        for p in low:
            lines.append(f"• *{p.name}*: {float(p.stock_quantity):.1f} {p.unit} remaining (threshold: {p.low_stock_threshold})")
        lines.append("\nTime to restock!")

        send_text(settings.owner_whatsapp_number, "\n".join(lines))
        logger.info("Low stock alert sent for %d products", len(low))


@celery_app.task(name="tasks.alert_tasks.send_weekly_report")
def send_weekly_report():
    from sqlalchemy import create_engine, func
    from sqlalchemy.orm import Session
    from datetime import datetime, timedelta, timezone
    from models.order import Order, OrderItem
    from models.product import Product
    from services.whatsapp_client import send_text
    from core.config import get_settings

    settings = get_settings()
    if not settings.owner_whatsapp_number:
        return

    engine = create_engine(settings.sync_database_url)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    with Session(engine) as db:
        orders = db.query(Order).filter(
            Order.created_at >= week_ago,
            Order.status.in_(["confirmed", "packed", "dispatched", "delivered"]),
        ).all()

        total_revenue = sum(float(o.total_amount) for o in orders)
        order_count = len(orders)

        # Top product by quantity sold
        top_result = (
            db.query(OrderItem.product_name, func.sum(OrderItem.quantity).label("qty"))
            .join(Order)
            .filter(Order.created_at >= week_ago)
            .group_by(OrderItem.product_name)
            .order_by(func.sum(OrderItem.quantity).desc())
            .first()
        )
        top_product = top_result[0] if top_result else "N/A"

        msg = (
            f"📊 *Arah Provisions — Weekly Report*\n\n"
            f"Orders this week: *{order_count}*\n"
            f"Total revenue: *₦{total_revenue:,.2f}*\n"
            f"Best seller: *{top_product}*\n\n"
            f"Have a great week! 🚀"
        )
        send_text(settings.owner_whatsapp_number, msg)


@celery_app.task(name="tasks.alert_tasks.broadcast_product_update")
def broadcast_product_update(product_id: str, event_type: str):
    """
    Notify all engaged customers (have an order OR have chatted via WhatsApp)
    when a new product is added or an existing one is restocked.
    event_type: 'new_product' | 'restock'
    """
    from sqlalchemy import create_engine, distinct
    from sqlalchemy.orm import Session
    from models.product import Product
    from models.customer import Customer
    from models.order import Order
    from services.whatsapp_client import send_text
    from core.config import get_settings

    settings = get_settings()
    engine = create_engine(settings.sync_database_url)

    with Session(engine) as db:
        prod = db.get(Product, product_id)
        if not prod:
            return

        # Customers who have placed at least one order (received a receipt)
        order_customer_ids = {
            row[0] for row in db.query(distinct(Order.customer_id)).all()
        }

        # Customers who have a WhatsApp ID (chatted with the bot)
        wa_customers = db.query(Customer).filter(
            Customer.whatsapp_id.isnot(None)
        ).all()

        # Union: any customer that has ordered OR chatted via WhatsApp
        targets = []
        seen_ids = set()
        for c in wa_customers:
            if str(c.id) in order_customer_ids or c.whatsapp_id:
                if c.whatsapp_id not in seen_ids:
                    targets.append(c)
                    seen_ids.add(c.whatsapp_id)

        if not targets:
            return

        if event_type == "new_product":
            msg = (
                f"✨ *New arrival at {settings.business_name}!*\n\n"
                f"*{prod.name}* is now available — ₦{float(prod.sale_price):,.0f} per {prod.unit}.\n"
                f"Reply *menu* to place an order."
            )
        else:
            msg = (
                f"📦 *Back in stock — {prod.name}!*\n\n"
                f"Now available at ₦{float(prod.sale_price):,.0f} per {prod.unit}.\n"
                f"Reply *menu* to order yours before it runs out."
            )

        for customer in targets:
            try:
                send_text(customer.whatsapp_id, msg)
                time.sleep(0.5)  # avoid hitting WhatsApp rate limits
            except Exception as e:
                logger.warning("Could not notify customer %s: %s", customer.whatsapp_id, e)

        logger.info(
            "Broadcast '%s' for product '%s' sent to %d customers",
            event_type, prod.name, len(targets),
        )
