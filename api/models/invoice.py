import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Boolean, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    pdf_bucket: Mapped[str] = mapped_column(String(100), default="invoices")
    pdf_object_key: Mapped[str | None] = mapped_column(Text)
    pdf_size_bytes: Mapped[int | None] = mapped_column(Integer)
    whatsapp_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    whatsapp_sent_at: Mapped[datetime | None] = mapped_column()
    due_date: Mapped[datetime | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    order: Mapped["Order"] = relationship("Order", foreign_keys=[order_id], lazy="selectin")  # noqa: F821
