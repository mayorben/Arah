"""Run once to seed initial products: python seed.py"""
import asyncio
import re
from sqlalchemy import select
from core.database import AsyncSessionLocal, engine, Base
import models  # noqa: F401  — registers all models with Base.metadata
from models.product import Product


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


PRODUCTS = [
    # ── Grains ────────────────────────────────────────────────────────────
    dict(
        name="Ofada Rice", category="Grains", unit="5kg bag",
        sale_price=4500, cost_price=3200, stock_quantity=50,
        low_stock_threshold=10, is_featured=True,
        short_description="Locally grown, richly aromatic. The rice that makes the stew worth it.",
        description="Ofada rice is a short-grain, unprocessed Nigerian rice with a distinctive earthy aroma. Sourced directly from farms in Ogun State, each bag is stone-sorted for quality.",
        image_url="https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
    ),
    dict(
        name="Long Grain Rice", category="Grains", unit="25kg bag",
        sale_price=28000, cost_price=22000, stock_quantity=30,
        low_stock_threshold=5,
        short_description="Clean, fluffy grains for everyday family meals.",
        description="Premium long-grain parboiled rice. Fluffy, separate grains every time — perfect for jollof, fried rice, or plain rice with any Nigerian soup.",
        image_url="https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=600&q=80",
    ),
    dict(
        name="Local Brown Rice", category="Grains", unit="5kg bag",
        sale_price=5200, cost_price=4000, stock_quantity=25,
        low_stock_threshold=8,
        short_description="Wholesome, nutty-flavoured whole grain rice.",
        description="Unpolished brown rice that retains its bran layer — higher in fibre and nutrients. Great for health-conscious households.",
        image_url="https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=600&q=80",
    ),

    # ── Legumes ───────────────────────────────────────────────────────────
    dict(
        name="Oloyin Beans", category="Legumes", unit="5kg bag",
        sale_price=5200, cost_price=3800, stock_quantity=40,
        low_stock_threshold=8, is_featured=True,
        short_description="Honey beans — sweet, creamy, and full of goodness.",
        description="Oloyin (honey beans) prized for their sweet flavour and creamy texture. Perfect for moin moin, akara, and beans porridge.",
        image_url="https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=600&q=80",
    ),
    dict(
        name="Black-eyed Beans", category="Legumes", unit="5kg bag",
        sale_price=4800, cost_price=3500, stock_quantity=35,
        low_stock_threshold=8,
        short_description="Versatile, protein-packed beans for every kitchen.",
        description="White beans with a distinctive black eye. Mild flavour and quick cooking time — the everyday bean for Nigerian households.",
        image_url="https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=600&q=80",
    ),

    # ── Oils & Fats ───────────────────────────────────────────────────────
    dict(
        name="Palm Oil", category="Oils & Fats", unit="5L keg",
        sale_price=6500, cost_price=4500, stock_quantity=25,
        low_stock_threshold=5, is_featured=True,
        short_description="Deep red, rich in flavour. The foundation of Nigerian cuisine.",
        description="Unrefined red palm oil, freshly processed and rich in beta-carotene. Essential for soups, stews, and rice dishes across Nigeria.",
        image_url="https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
    ),
    dict(
        name="Groundnut Oil", category="Oils & Fats", unit="5L bottle",
        sale_price=7200, cost_price=5500, stock_quantity=20,
        low_stock_threshold=5,
        short_description="Light, clean, versatile. Perfect for frying and stewing.",
        description="Cold-pressed groundnut oil with a high smoke point. Ideal for deep frying and sautéing without overpowering the dish.",
        image_url="https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
    ),

    # ── Swallow ───────────────────────────────────────────────────────────
    dict(
        name="Garri (White)", category="Swallow", unit="10kg bag",
        sale_price=4200, cost_price=3000, stock_quantity=45,
        low_stock_threshold=10,
        short_description="Freshly processed, fine-grade. Eat as eba or soak — no wrong answer.",
        description="Fine white garri processed from fresh cassava. Soak with cold water for a refreshing snack, or make smooth eba with hot water.",
        image_url="https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80",
    ),
    dict(
        name="Semovita", category="Swallow", unit="2kg pack",
        sale_price=1800, cost_price=1300, stock_quantity=60,
        low_stock_threshold=15,
        short_description="Smooth and satisfying. The classic swallow your family loves.",
        description="Semolina-based swallow with a light colour and smooth texture. Cooks in minutes and pairs with egusi, ogbono, or any Nigerian soup.",
        image_url="https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80",
    ),
    dict(
        name="Pounded Yam Flour", category="Swallow", unit="2kg pack",
        sale_price=3200, cost_price=2500, stock_quantity=40,
        low_stock_threshold=10,
        short_description="Authentic pounded yam taste — ready in minutes.",
        description="Instant pounded yam flour made from real yam. Boil water, pour and stir for fluffy pounded yam in under 5 minutes.",
        image_url="https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80",
    ),

    # ── Seasonings ────────────────────────────────────────────────────────
    dict(
        name="Crayfish (Ground)", category="Seasonings", unit="500g pack",
        sale_price=1500, cost_price=1000, stock_quantity=80,
        low_stock_threshold=20,
        short_description="Smoky, pungent, irreplaceable. The soul of every great Nigerian soup.",
        description="Sun-dried and coarsely ground crayfish from the Niger Delta. Adds deep umami and that unmistakable Nigerian flavour to soups and stews.",
        image_url="https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=600&q=80",
    ),
    dict(
        name="Dried Stockfish", category="Proteins", unit="per piece",
        sale_price=2500, cost_price=1800, stock_quantity=30,
        low_stock_threshold=5,
        short_description="Aged to perfection. Adds depth and richness to any pot.",
        description="Premium dried stockfish (okporoko) that adds incomparable depth to egusi and ofe onugbu. Each piece is properly dried and ready to soak.",
        image_url="https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=600&q=80",
    ),
    dict(
        name="Locust Beans (Iru)", category="Seasonings", unit="200g pack",
        sale_price=900, cost_price=600, stock_quantity=60,
        low_stock_threshold=15,
        short_description="Traditional fermented seasoning for depth and umami.",
        description="Fermented locust beans (iru/dawadawa) — the traditional flavour enhancer that gives egusi and bitter leaf soup their authentic depth.",
        image_url="https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=600&q=80",
    ),
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    seeded = 0
    async with AsyncSessionLocal() as db:
        for data in PRODUCTS:
            existing = await db.execute(select(Product).where(Product.name == data["name"]))
            if existing.scalar_one_or_none():
                continue
            db.add(Product(slug=_slug(data["name"]), **data))
            seeded += 1
        await db.commit()

    print(f"✓ Seeded {seeded} new products ({len(PRODUCTS) - seeded} already existed).")


if __name__ == "__main__":
    asyncio.run(seed())
