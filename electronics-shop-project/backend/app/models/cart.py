import uuid
import uuid as _uuid_lib
from datetime import datetime
from sqlalchemy import Integer, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects.postgresql import UUID as _DB_UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Cart(Base):
    __tablename__ = "carts"

    id: Mapped["_uuid_lib.UUID"] = mapped_column(_DB_UUID(as_uuid=True), primary_key=True, default=_uuid_lib.uuid4)
    customer_id: Mapped["_uuid_lib.UUID"] = mapped_column(ForeignKey("customers.id"), unique=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("cart_id", "product_id"),)

    id: Mapped["_uuid_lib.UUID"] = mapped_column(_DB_UUID(as_uuid=True), primary_key=True, default=_uuid_lib.uuid4)
    cart_id: Mapped["_uuid_lib.UUID"] = mapped_column(ForeignKey("carts.id", ondelete="CASCADE"))
    product_id: Mapped["_uuid_lib.UUID"] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
