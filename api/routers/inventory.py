import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from core.database import get_db
from core.security import get_current_admin
from models.product import Product
from models.stock import StockMovement
from models.supplier import Supplier

router = APIRouter(prefix="/inventory", tags=["inventory"])


class RestockIn(BaseModel):
    product_id: str
    quantity: float
    unit_cost: Optional[float] = None
    supplier_id: Optional[str] = None
    notes: Optional[str] = None


class SupplierCreate(BaseModel):
    name: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


@router.get("/low-stock", dependencies=[Depends(get_current_admin)])
async def low_stock(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product).where(
            Product.is_active == True,
            Product.stock_quantity <= Product.low_stock_threshold,
        ).order_by(Product.stock_quantity)
    )
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "stock_quantity": float(p.stock_quantity),
            "low_stock_threshold": p.low_stock_threshold,
            "unit": p.unit,
        }
        for p in result.scalars()
    ]


@router.post("/restock", dependencies=[Depends(get_current_admin)])
async def restock(data: RestockIn, db: AsyncSession = Depends(get_db)):
    prod = await db.get(Product, uuid.UUID(data.product_id))
    if not prod:
        raise HTTPException(404, "Product not found")

    new_qty = float(prod.stock_quantity) + data.quantity
    movement = StockMovement(
        product_id=prod.id,
        movement_type="restock",
        quantity_change=data.quantity,
        quantity_after=new_qty,
        supplier_id=uuid.UUID(data.supplier_id) if data.supplier_id else None,
        unit_cost=data.unit_cost,
        notes=data.notes,
    )
    prod.stock_quantity = new_qty
    db.add(movement)
    await db.commit()

    # Notify engaged customers about the restock
    from tasks.alert_tasks import broadcast_product_update
    broadcast_product_update.delay(str(prod.id), "restock")

    return {"product": prod.name, "new_quantity": new_qty}


@router.get("/movements", dependencies=[Depends(get_current_admin)])
async def list_movements(product_id: Optional[str] = None, limit: int = 50, db: AsyncSession = Depends(get_db)):
    q = select(StockMovement).order_by(StockMovement.created_at.desc()).limit(limit)
    if product_id:
        q = q.where(StockMovement.product_id == uuid.UUID(product_id))
    result = await db.execute(q)
    return [
        {
            "id": str(m.id),
            "product_name": m.product.name if m.product else "",
            "type": m.movement_type,
            "quantity_change": float(m.quantity_change),
            "quantity_after": float(m.quantity_after),
            "notes": m.notes,
            "created_at": m.created_at.isoformat(),
        }
        for m in result.scalars()
    ]


@router.get("/suppliers", dependencies=[Depends(get_current_admin)])
async def list_suppliers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplier).order_by(Supplier.name))
    return [
        {"id": str(s.id), "name": s.name, "phone": s.phone, "contact_name": s.contact_name}
        for s in result.scalars()
    ]


@router.post("/suppliers", dependencies=[Depends(get_current_admin)])
async def create_supplier(data: SupplierCreate, db: AsyncSession = Depends(get_db)):
    s = Supplier(**data.model_dump())
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return {"id": str(s.id), "name": s.name}
