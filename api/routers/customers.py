import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from core.database import get_db
from core.security import get_current_admin
from models.customer import Customer

router = APIRouter(prefix="/customers", tags=["customers"])


class CustomerCreate(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    delivery_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    notes: Optional[str] = None


def _fmt(c: Customer) -> dict:
    return {
        "id": str(c.id),
        "full_name": c.full_name,
        "phone": c.phone,
        "whatsapp_id": c.whatsapp_id,
        "email": c.email,
        "delivery_address": c.delivery_address,
        "city": c.city,
        "state": c.state,
        "notes": c.notes,
        "total_orders": c.total_orders,
        "total_spent": float(c.total_spent),
        "created_at": c.created_at.isoformat(),
    }


@router.get("", dependencies=[Depends(get_current_admin)])
async def list_customers(search: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Customer).order_by(Customer.created_at.desc())
    if search:
        q = q.where(Customer.full_name.ilike(f"%{search}%") | Customer.phone.ilike(f"%{search}%"))
    result = await db.execute(q)
    return [_fmt(c) for c in result.scalars()]


@router.get("/{customer_id}", dependencies=[Depends(get_current_admin)])
async def get_customer(customer_id: str, db: AsyncSession = Depends(get_db)):
    c = await db.get(Customer, uuid.UUID(customer_id))
    if not c:
        raise HTTPException(404, "Customer not found")
    return _fmt(c)


@router.post("", dependencies=[Depends(get_current_admin)])
async def create_customer(data: CustomerCreate, db: AsyncSession = Depends(get_db)):
    c = Customer(**data.model_dump())
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return _fmt(c)


@router.put("/{customer_id}", dependencies=[Depends(get_current_admin)])
async def update_customer(customer_id: str, data: CustomerCreate, db: AsyncSession = Depends(get_db)):
    c = await db.get(Customer, uuid.UUID(customer_id))
    if not c:
        raise HTTPException(404, "Customer not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(c, k, v)
    await db.commit()
    await db.refresh(c)
    return _fmt(c)
