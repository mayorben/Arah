from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
from core.database import get_db
from core.security import get_current_admin
from models.order import Order, OrderItem
from models.product import Product
from models.customer import Customer

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", dependencies=[Depends(get_current_admin)])
async def overview(db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    # Total revenue this month
    month_orders = await db.execute(
        select(func.sum(Order.total_amount)).where(
            Order.created_at >= month_start,
            Order.status.in_(["confirmed", "packed", "dispatched", "delivered"]),
        )
    )
    monthly_revenue = float(month_orders.scalar() or 0)

    # Orders this week
    week_orders = await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= week_ago)
    )
    weekly_orders = int(week_orders.scalar() or 0)

    # Total customers
    cust_count = await db.execute(select(func.count(Customer.id)))
    total_customers = int(cust_count.scalar() or 0)

    # Low stock count
    low_stock = await db.execute(
        select(func.count(Product.id)).where(
            Product.is_active == True,
            Product.stock_quantity <= Product.low_stock_threshold,
        )
    )
    low_stock_count = int(low_stock.scalar() or 0)

    # Top products by revenue (last 30 days)
    top_result = await db.execute(
        select(OrderItem.product_name, func.sum(OrderItem.line_total).label("revenue"))
        .join(Order)
        .where(Order.created_at >= now - timedelta(days=30))
        .group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.line_total).desc())
        .limit(5)
    )
    top_products = [{"name": row[0], "revenue": float(row[1])} for row in top_result]

    # Recent orders
    recent = await db.execute(
        select(Order).order_by(Order.created_at.desc()).limit(10)
    )
    recent_orders = [
        {
            "order_number": o.order_number,
            "customer_name": o.customer.full_name if o.customer else "",
            "total": float(o.total_amount),
            "status": o.status,
            "created_at": o.created_at.isoformat(),
        }
        for o in recent.scalars()
    ]

    return {
        "monthly_revenue": monthly_revenue,
        "weekly_orders": weekly_orders,
        "total_customers": total_customers,
        "low_stock_count": low_stock_count,
        "top_products": top_products,
        "recent_orders": recent_orders,
    }
