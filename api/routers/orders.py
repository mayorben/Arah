import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from core.database import get_db
from core.security import get_current_admin
from models.order import Order, OrderItem
from models.customer import Customer
from models.product import Product
from models.invoice import Invoice

router = APIRouter(prefix="/orders", tags=["orders"])


class OrderItemIn(BaseModel):
    product_id: str
    quantity: float


class OrderCreate(BaseModel):
    customer_phone: str
    customer_name: str
    items: list[OrderItemIn]
    delivery_address: Optional[str] = None
    delivery_city: Optional[str] = None
    notes: Optional[str] = None
    delivery_fee: float = 0


def _fmt_order(o: Order) -> dict:
    return {
        "id": str(o.id),
        "order_number": o.order_number,
        "customer_id": str(o.customer_id),
        "customer_name": o.customer.full_name if o.customer else "",
        "status": o.status,
        "channel": o.channel,
        "total_amount": float(o.total_amount),
        "payment_status": o.payment_status,
        "delivery_address": o.delivery_address,
        "notes": o.notes,
        "created_at": o.created_at.isoformat(),
        "items": [
            {
                "product_name": i.product_name,
                "quantity": float(i.quantity),
                "unit_price": float(i.unit_price),
                "line_total": float(i.line_total),
                "unit": i.unit,
            }
            for i in o.items
        ],
    }


def _next_order_number_sync(count: int) -> str:
    from datetime import datetime, timezone
    year = datetime.now(timezone.utc).strftime("%Y")
    return f"ARH-{year}-{count:05d}"


def _next_invoice_number_sync(count: int) -> str:
    from datetime import datetime, timezone
    year = datetime.now(timezone.utc).strftime("%Y")
    return f"INV-{year}-{count:05d}"


@router.get("", dependencies=[Depends(get_current_admin)])
async def list_orders(status: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Order).order_by(Order.created_at.desc())
    if status:
        q = q.where(Order.status == status)
    result = await db.execute(q)
    return [_fmt_order(o) for o in result.scalars()]


@router.get("/{order_id}")
async def get_order(order_id: str, db: AsyncSession = Depends(get_db)):
    o = await db.get(Order, uuid.UUID(order_id))
    if not o:
        raise HTTPException(404, "Order not found")
    return _fmt_order(o)


@router.post("")
async def create_order(data: OrderCreate, db: AsyncSession = Depends(get_db)):
    # Upsert customer
    result = await db.execute(select(Customer).where(Customer.phone == data.customer_phone))
    customer = result.scalar_one_or_none()
    if not customer:
        customer = Customer(full_name=data.customer_name, phone=data.customer_phone)
        db.add(customer)
        await db.flush()

    # Count existing orders for number
    count_result = await db.execute(select(Order))
    count = len(count_result.scalars().all()) + 1
    order_number = _next_order_number_sync(count)

    subtotal = 0.0
    items_to_add = []
    for item_in in data.items:
        prod = await db.get(Product, uuid.UUID(item_in.product_id))
        if not prod:
            raise HTTPException(404, f"Product {item_in.product_id} not found")
        lt = float(item_in.quantity) * float(prod.sale_price)
        subtotal += lt
        items_to_add.append((prod, item_in.quantity, lt))

    total = subtotal + data.delivery_fee
    order = Order(
        order_number=order_number,
        customer_id=customer.id,
        status="pending",
        channel="web",
        subtotal=subtotal,
        delivery_fee=data.delivery_fee,
        total_amount=total,
        delivery_address=data.delivery_address,
        delivery_city=data.delivery_city,
        notes=data.notes,
    )
    db.add(order)
    await db.flush()

    for prod, qty, lt in items_to_add:
        oi = OrderItem(
            order_id=order.id,
            product_id=prod.id,
            product_name=prod.name,
            unit=prod.unit,
            quantity=qty,
            unit_price=float(prod.sale_price),
            line_total=lt,
        )
        db.add(oi)
        prod.stock_quantity = float(prod.stock_quantity) - float(qty)

    # Create invoice and trigger generation
    inv_count_result = await db.execute(select(Invoice))
    inv_count = len(inv_count_result.scalars().all()) + 1
    invoice = Invoice(
        invoice_number=_next_invoice_number_sync(inv_count),
        order_id=order.id,
        status="draft",
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(order)
    await db.refresh(invoice)

    # Enqueue invoice task (best-effort — no-ops when Redis/Celery unavailable)
    try:
        from tasks.invoice_tasks import generate_and_send_invoice
        generate_and_send_invoice.delay(str(invoice.id))
    except Exception:
        pass

    return _fmt_order(order)


@router.patch("/{order_id}/status", dependencies=[Depends(get_current_admin)])
async def update_status(order_id: str, status: str, db: AsyncSession = Depends(get_db)):
    o = await db.get(Order, uuid.UUID(order_id))
    if not o:
        raise HTTPException(404, "Order not found")
    valid = {"pending", "confirmed", "packed", "dispatched", "delivered", "cancelled"}
    if status not in valid:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid}")
    o.status = status
    await db.commit()
    return {"order_number": o.order_number, "status": o.status}
