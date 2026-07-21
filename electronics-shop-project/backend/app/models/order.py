import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"))
    promotion_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("promotions.id"))
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    discount_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    final_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(20), default="full")  # full | installment
    status: Mapped[str] = mapped_column(String(20), default="pending")
    shipping_address: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    unit_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
