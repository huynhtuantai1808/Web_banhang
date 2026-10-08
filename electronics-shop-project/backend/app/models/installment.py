import uuid
import uuid as _uuid_lib
from datetime import date, datetime
from sqlalchemy import String, Numeric, DateTime, Date, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects.postgresql import UUID as _DB_UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class InstallmentPlan(Base):
    __tablename__ = "installment_plans"

    id: Mapped["_uuid_lib.UUID"] = mapped_column(_DB_UUID(as_uuid=True), primary_key=True, default=_uuid_lib.uuid4)
    order_id: Mapped["_uuid_lib.UUID"] = mapped_column(ForeignKey("orders.id"))
    total_months: Mapped[int] = mapped_column(Integer, nullable=False)
    monthly_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    interest_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    down_payment: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InstallmentPayment(Base):
    __tablename__ = "installment_payments"

    id: Mapped["_uuid_lib.UUID"] = mapped_column(_DB_UUID(as_uuid=True), primary_key=True, default=_uuid_lib.uuid4)
    plan_id: Mapped["_uuid_lib.UUID"] = mapped_column(ForeignKey("installment_plans.id", ondelete="CASCADE"))
    period_no: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="unpaid")
