import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timezone
from core.database import get_db
from core.security import get_current_admin
from models.ai_content import AIContent
from models.product import Product

router = APIRouter(prefix="/ai-content", tags=["ai-content"])

PROMPT_TEMPLATES = {
    "description": (
        "You are writing for {business_name}, a premium Nigerian food provisions brand.\n"
        "Write a warm, editorial 2-sentence product description.\n"
        "Product: {name} | Category: {category} | Sold as: {unit} | Price: ₦{price}\n"
        "Tone: trustworthy, high-quality, appetising. No filler phrases."
    ),
    "short_description": (
        "Write a punchy 15-word tagline for this food provisions product: {name} ({unit}).\n"
        "Brand: {business_name}. Tone: premium, warm, Nigerian market."
    ),
    "whatsapp_caption": (
        "Write a punchy WhatsApp broadcast caption for: {name} at ₦{price} per {unit}.\n"
        "Max 3 sentences. Nigerian household audience. Subtle call-to-action.\n"
        "No excess emojis. End with the store's WhatsApp number."
    ),
    "restock_announcement": (
        "Write a 2-sentence WhatsApp status post: {name} is back in stock at ₦{price} per {unit}.\n"
        "Tone: excited but professional."
    ),
}


class SaveContentIn(BaseModel):
    product_id: Optional[str] = None
    content_type: str
    generated_text: str


class ApplyContentIn(BaseModel):
    content_id: str
    apply_to_field: str


@router.get("/prompts/{product_id}", dependencies=[Depends(get_current_admin)])
async def get_prompts(product_id: str, db: AsyncSession = Depends(get_db)):
    from core.config import get_settings
    settings = get_settings()
    p = await db.get(Product, uuid.UUID(product_id))
    if not p:
        raise HTTPException(404, "Product not found")

    ctx = {
        "business_name": settings.business_name,
        "name": p.name,
        "category": p.category or "provisions",
        "unit": p.unit,
        "price": f"{float(p.sale_price):,.0f}",
    }

    return {
        content_type: template.format(**ctx)
        for content_type, template in PROMPT_TEMPLATES.items()
    }


@router.post("", dependencies=[Depends(get_current_admin)])
async def save_content(data: SaveContentIn, db: AsyncSession = Depends(get_db)):
    content = AIContent(
        product_id=uuid.UUID(data.product_id) if data.product_id else None,
        content_type=data.content_type,
        generated_text=data.generated_text,
        accepted=False,
    )
    db.add(content)
    await db.commit()
    await db.refresh(content)
    return {"id": str(content.id), "content_type": content.content_type}


@router.post("/apply", dependencies=[Depends(get_current_admin)])
async def apply_content(data: ApplyContentIn, db: AsyncSession = Depends(get_db)):
    content = await db.get(AIContent, uuid.UUID(data.content_id))
    if not content:
        raise HTTPException(404, "Content not found")

    if content.product_id and data.apply_to_field in ("description", "short_description"):
        prod = await db.get(Product, content.product_id)
        if prod:
            setattr(prod, data.apply_to_field, content.generated_text)

    content.accepted = True
    content.applied_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}


@router.get("/{product_id}", dependencies=[Depends(get_current_admin)])
async def list_content(product_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AIContent)
        .where(AIContent.product_id == uuid.UUID(product_id))
        .order_by(AIContent.created_at.desc())
    )
    return [
        {
            "id": str(c.id),
            "content_type": c.content_type,
            "generated_text": c.generated_text,
            "accepted": c.accepted,
            "created_at": c.created_at.isoformat(),
        }
        for c in result.scalars()
    ]
