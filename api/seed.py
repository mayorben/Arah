"""Run once to seed initial products: python seed.py"""
import asyncio
from core.database import AsyncSessionLocal, engine, Base
# Import all models so Base.metadata.create_all creates every table
import models  # noqa: F401
from models.product import Product


PRODUCTS = [
    {"name": "Ofada Rice", "category": "Grains", "unit": "5kg bag", "sale_price": 4500, "cost_price": 3200, "stock_quantity": 50, "low_stock_threshold": 10, "is_featured": True,
     "short_description": "Locally grown, richly aromatic. The rice that makes the stew worth it."},
    {"name": "Long Grain Rice", "category": "Grains", "unit": "25kg bag", "sale_price": 28000, "cost_price": 22000, "stock_quantity": 30, "low_stock_threshold": 5,
     "short_description": "Clean, fluffy grains for everyday family meals."},
    {"name": "Oloyin Beans", "category": "Legumes", "unit": "5kg bag", "sale_price": 5200, "cost_price": 3800, "stock_quantity": 40, "low_stock_threshold": 8, "is_featured": True,
     "short_description": "Honey beans — sweet, creamy, and full of goodness."},
    {"name": "Brown Beans", "category": "Legumes", "unit": "5kg bag", "sale_price": 4800, "cost_price": 3500, "stock_quantity": 35, "low_stock_threshold": 8,
     "short_description": "Earthy and hearty. A Nigerian kitchen essential."},
    {"name": "Palm Oil", "category": "Oils & Fats", "unit": "5L bottle", "sale_price": 6500, "cost_price": 4500, "stock_quantity": 25, "low_stock_threshold": 5, "is_featured": True,
     "short_description": "Deep red, rich in flavour. The foundation of Nigerian cuisine."},
    {"name": "Groundnut Oil", "category": "Oils & Fats", "unit": "5L bottle", "sale_price": 7200, "cost_price": 5500, "stock_quantity": 20, "low_stock_threshold": 5,
     "short_description": "Light, clean, versatile. Perfect for frying and stewing."},
    {"name": "Semovita", "category": "Swallow", "unit": "2kg pack", "sale_price": 1800, "cost_price": 1300, "stock_quantity": 60, "low_stock_threshold": 15,
     "short_description": "Smooth and satisfying. The classic swallow your family loves."},
    {"name": "Garri (White)", "category": "Swallow", "unit": "10kg bag", "sale_price": 4200, "cost_price": 3000, "stock_quantity": 45, "low_stock_threshold": 10,
     "short_description": "Freshly processed, fine-grade. Eat as eba or soak — no wrong answer."},
    {"name": "Crayfish", "category": "Seasonings", "unit": "500g pack", "sale_price": 1500, "cost_price": 1000, "stock_quantity": 80, "low_stock_threshold": 20,
     "short_description": "Smoky, pungent, irreplaceable. The soul of every great Nigerian soup."},
    {"name": "Dried Stockfish", "category": "Proteins", "unit": "per piece", "sale_price": 2500, "cost_price": 1800, "stock_quantity": 30, "low_stock_threshold": 5,
     "short_description": "Aged to perfection. Adds depth and richness to any pot."},
]


def _slugify(name: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        for data in PRODUCTS:
            from sqlalchemy import select
            existing = await db.execute(select(Product).where(Product.name == data["name"]))
            if existing.scalar_one_or_none():
                continue
            p = Product(slug=_slugify(data["name"]), **data)
            db.add(p)
        await db.commit()
        print(f"Seeded {len(PRODUCTS)} products.")


if __name__ == "__main__":
    asyncio.run(seed())
