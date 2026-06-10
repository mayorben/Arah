import json
import logging
from tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

PRODUCT_LIST_TEMPLATE = """
*{name}* — ₦{price:,.0f} per {unit}
"""


@celery_app.task(name="tasks.whatsapp_tasks.process_whatsapp_event", bind=True)
def process_whatsapp_event(self, payload: dict):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    import redis as redis_lib
    from models.customer import Customer
    from models.product import Product
    from models.order import Order
    from models.order import OrderItem
    from models.invoice import Invoice
    from services.whatsapp_client import send_text
    from core.config import get_settings
    import uuid as uuid_mod
    from datetime import datetime, timezone

    settings = get_settings()
    rdb = redis_lib.from_url(settings.redis_url, decode_responses=True)
    engine = create_engine(settings.sync_database_url)

    try:
        value = payload.get("value", {})
        messages = value.get("messages", [])
        if not messages:
            return

        msg = messages[0]
        wa_id = msg.get("from")
        msg_id = msg.get("id", "")
        msg_type = msg.get("type", "")

        # Deduplicate
        dedup_key = f"wa_msg:{msg_id}"
        if rdb.get(dedup_key):
            return
        rdb.setex(dedup_key, 86400, "1")

        body = ""
        if msg_type == "text":
            body = msg.get("text", {}).get("body", "").strip().lower()
        else:
            return

        session_key = f"wa_session:{wa_id}"
        cart_key = f"wa_cart:{wa_id}"
        state = rdb.hget(session_key, "state") or "IDLE"
        rdb.expire(session_key, 7200)

        with Session(engine) as db:
            # Upsert customer
            customer = db.query(Customer).filter_by(whatsapp_id=wa_id).first()
            if not customer:
                customer = Customer(
                    id=uuid_mod.uuid4(),
                    full_name="WhatsApp Customer",
                    phone=wa_id,
                    whatsapp_id=wa_id,
                )
                db.add(customer)
                db.commit()
                db.refresh(customer)

            products = db.query(Product).filter_by(is_active=True).order_by(Product.name).all()

            def product_menu():
                lines = ["*Arah Provisions* 🛒\n\nHere's what we have:\n"]
                for i, p in enumerate(products, 1):
                    qty = float(p.stock_quantity)
                    avail = "✅" if qty > 0 else "❌ Out of stock"
                    lines.append(f"{i}. *{p.name}* — ₦{float(p.sale_price):,.0f} per {p.unit} {avail}")
                lines.append("\nReply with the item number to add to your order. Type *done* to checkout.")
                return "\n".join(lines)

            if state == "IDLE" or body in ["hi", "hello", "hey", "start", "menu", "order"]:
                send_text(wa_id, f"Hello! 👋 Welcome to *{settings.business_name}*.\n\n" + product_menu())
                rdb.hset(session_key, "state", "BROWSING")
                rdb.expire(session_key, 7200)

            elif state == "BROWSING":
                if body.isdigit():
                    idx = int(body) - 1
                    if 0 <= idx < len(products):
                        p = products[idx]
                        if float(p.stock_quantity) <= 0:
                            send_text(wa_id, f"Sorry, *{p.name}* is out of stock. Choose another item.")
                        else:
                            rdb.hset(session_key, "selected_product", str(p.id))
                            rdb.hset(session_key, "state", "AWAITING_QTY")
                            rdb.expire(session_key, 7200)
                            send_text(wa_id, f"You selected *{p.name}* at ₦{float(p.sale_price):,.0f} per {p.unit}.\nHow many do you want?")
                    else:
                        send_text(wa_id, "Invalid number. Please pick from the menu above.")
                elif body in ["done", "checkout", "order"]:
                    cart_raw = rdb.get(cart_key)
                    cart = json.loads(cart_raw) if cart_raw else []
                    if not cart:
                        send_text(wa_id, "Your cart is empty. Pick items from the menu first.")
                    else:
                        lines = ["*Your Order Summary:*\n"]
                        total = 0.0
                        for ci in cart:
                            prod = db.get(Product, ci["product_id"])
                            lt = float(ci["quantity"]) * float(ci["price"])
                            total += lt
                            lines.append(f"• {prod.name} x{ci['quantity']} = ₦{lt:,.0f}")
                        lines.append(f"\n*Total: ₦{total:,.2f}*")
                        lines.append("\nType *yes* to confirm, or *cancel* to clear your cart.")
                        send_text(wa_id, "\n".join(lines))
                        rdb.hset(session_key, "state", "CONFIRMING")
                        rdb.expire(session_key, 7200)

            elif state == "AWAITING_QTY":
                try:
                    qty = float(body)
                    assert qty > 0
                    product_id = rdb.hget(session_key, "selected_product")
                    prod = db.get(Product, product_id)
                    cart_raw = rdb.get(cart_key)
                    cart = json.loads(cart_raw) if cart_raw else []
                    cart.append({"product_id": product_id, "quantity": qty, "price": float(prod.sale_price)})
                    rdb.setex(cart_key, 7200, json.dumps(cart))
                    send_text(wa_id, f"Added *{qty} x {prod.name}* to your cart. ✅\n\n" + product_menu() + "\n\nType *done* to checkout.")
                    rdb.hset(session_key, "state", "BROWSING")
                    rdb.expire(session_key, 7200)
                except (ValueError, AssertionError):
                    send_text(wa_id, "Please enter a valid number (e.g. 2 or 1.5).")

            elif state == "CONFIRMING":
                if body in ["yes", "confirm", "ok"]:
                    cart_raw = rdb.get(cart_key)
                    cart = json.loads(cart_raw) if cart_raw else []
                    if not cart:
                        send_text(wa_id, "Your cart is empty. Type *menu* to start again.")
                        rdb.hset(session_key, "state", "IDLE")
                        return

                    # Build order
                    total = sum(float(ci["quantity"]) * float(ci["price"]) for ci in cart)
                    order_num = _next_order_number(db)
                    order = Order(
                        id=uuid_mod.uuid4(),
                        order_number=order_num,
                        customer_id=customer.id,
                        status="confirmed",
                        channel="whatsapp",
                        subtotal=total,
                        total_amount=total,
                    )
                    db.add(order)
                    db.flush()

                    for ci in cart:
                        prod = db.get(Product, ci["product_id"])
                        item = OrderItem(
                            id=uuid_mod.uuid4(),
                            order_id=order.id,
                            product_id=prod.id,
                            product_name=prod.name,
                            unit=prod.unit,
                            quantity=ci["quantity"],
                            unit_price=ci["price"],
                            line_total=float(ci["quantity"]) * float(ci["price"]),
                        )
                        db.add(item)
                        prod.stock_quantity = float(prod.stock_quantity) - float(ci["quantity"])

                    invoice_num = _next_invoice_number(db)
                    invoice = Invoice(
                        id=uuid_mod.uuid4(),
                        invoice_number=invoice_num,
                        order_id=order.id,
                        status="draft",
                    )
                    db.add(invoice)
                    db.commit()

                    # Clear cart + session
                    rdb.delete(cart_key)
                    rdb.delete(session_key)

                    send_text(wa_id, f"✅ *Order confirmed!* Your order number is *{order_num}*.\nWe're generating your invoice now — it'll arrive shortly.")

                    # Trigger invoice generation
                    from tasks.invoice_tasks import generate_and_send_invoice
                    generate_and_send_invoice.delay(str(invoice.id))

                elif body in ["cancel", "no", "clear"]:
                    rdb.delete(cart_key)
                    rdb.hset(session_key, "state", "IDLE")
                    send_text(wa_id, "Cart cleared. Type *hi* to start a new order. 👋")
                else:
                    send_text(wa_id, "Reply *yes* to confirm or *cancel* to clear your cart.")

    except Exception as exc:
        logger.error("WhatsApp event processing failed: %s", exc, exc_info=True)


def _next_order_number(db) -> str:
    from datetime import datetime, timezone
    from models.order import Order
    year = datetime.now(timezone.utc).strftime("%Y")
    count = db.query(Order).count() + 1
    return f"ARH-{year}-{count:05d}"


def _next_invoice_number(db) -> str:
    from datetime import datetime, timezone
    from models.invoice import Invoice
    year = datetime.now(timezone.utc).strftime("%Y")
    count = db.query(Invoice).count() + 1
    return f"INV-{year}-{count:05d}"
