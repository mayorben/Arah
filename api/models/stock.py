import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    movement_type: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity_change: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    quantity_after: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    reference_id: Mapped[str | None] = mapped_column(String(100))
    reference_type: Mapped[str | None] = mapped_column(String(50))
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"))
    unit_cost: Mapped[float | None] = mapped_column(Numeric(12, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    product: Mapped["Product"] = relationship("Product", foreign_keys=[product_id], lazy="selectin")  # noqa: F821
    supplier: Mapped["Supplier"] = relationship("Supplier", foreign_keys=[supplier_id], lazy="selectin")  # noqa: F821
