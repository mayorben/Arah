from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import engine, Base
from core.config import get_settings
from routers import auth, products, customers, orders, inventory, invoices, analytics, whatsapp, ai_content

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup (safe if already exist)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Ensure Supabase Storage buckets exist
    try:
        from services.storage_client import ensure_buckets
        ensure_buckets()
    except Exception as e:
        print(f"Warning: Storage setup failed: {e}")

    yield


app = FastAPI(
    title=settings.app_name,
    description="Food provisions business management API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(inventory.router)
app.include_router(invoices.router)
app.include_router(analytics.router)
app.include_router(whatsapp.router)
app.include_router(ai_content.router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}
