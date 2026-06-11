import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from core.database import get_db
from core.security import get_current_admin
from models.product import Product
from services.storage_client import upload_bytes, get_public_url, ensure_buckets
from core.config import get_settings

router = APIRouter(prefix="/products", tags=["products"])
settings = get_settings()


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    category: Optional[str] = None
    unit: str = "unit"
    sale_price: float
    cost_price: Optional[float] = None
    stock_quantity: float = 0
    low_stock_threshold: int = 10
    is_active: bool = True
    is_featured: bool = False


class ProductUpdate(ProductCreate):
    name: Optional[str] = None
    sale_price: Optional[float] = None


def _slugify(name: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _product_dict(p: Product) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "slug": p.slug,
        "description": p.description,
        "short_description": p.short_description,
        "category": p.category,
        "unit": p.unit,
        "sale_price": float(p.sale_price),
        "cost_price": float(p.cost_price) if p.cost_price else None,
        "stock_quantity": float(p.stock_quantity),
        "low_stock_threshold": p.low_stock_threshold,
        "image_url": p.image_url,
        "is_active": p.is_active,
        "is_featured": p.is_featured,
        "created_at": p.created_at.isoformat(),
    }


@router.get("")
async def list_products(active_only: bool = True, db: AsyncSession = Depends(get_db)):
    q = select(Product)
    if active_only:
        q = q.where(Product.is_active == True)
    q = q.order_by(Product.name)
    result = await db.execute(q)
    return [_product_dict(p) for p in result.scalars()]


@router.get("/{product_id}")
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    p = await db.get(Product, uuid.UUID(product_id))
    if not p:
        raise HTTPException(404, "Product not found")
    return _product_dict(p)


@router.post("", dependencies=[Depends(get_current_admin)])
async def create_product(data: ProductCreate, db: AsyncSession = Depends(get_db)):
    slug = _slugify(data.name)
    result = await db.execute(select(Product).where(Product.slug == slug))
    if result.scalar_one_or_none():
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"

    p = Product(slug=slug, **data.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)

    if data.is_active:
        try:
            from tasks.alert_tasks import broadcast_product_update
            broadcast_product_update.delay(str(p.id), "new_product")
        except Exception:
            pass

    return _product_dict(p)


@router.put("/{product_id}", dependencies=[Depends(get_current_admin)])
async def update_product(product_id: str, data: ProductUpdate, db: AsyncSession = Depends(get_db)):
    p = await db.get(Product, uuid.UUID(product_id))
    if not p:
        raise HTTPException(404, "Product not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    return _product_dict(p)


@router.delete("/{product_id}", dependencies=[Depends(get_current_admin)])
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db)):
    p = await db.get(Product, uuid.UUID(product_id))
    if not p:
        raise HTTPException(404, "Product not found")
    p.is_active = False
    await db.commit()
    return {"ok": True}


@router.post("/{product_id}/image", dependencies=[Depends(get_current_admin)])
async def upload_image(product_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    p = await db.get(Product, uuid.UUID(product_id))
    if not p:
        raise HTTPException(404, "Product not found")

    data = await file.read()
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    key = f"{product_id}/thumbnail.{ext}"
    ensure_buckets()
    upload_bytes(settings.storage_bucket_products, key, data, f"image/{ext}")
    p.image_url = get_public_url(settings.storage_bucket_products, key)
    await db.commit()
    return {"image_url": p.image_url}
