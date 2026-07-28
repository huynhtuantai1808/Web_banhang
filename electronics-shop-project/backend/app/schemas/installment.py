import uuid
from datetime import date, datetime
from pydantic import BaseModel


class InstallmentPaymentOut(BaseModel):
    id: uuid.UUID
    period_no: int
    due_date: date
    amount: float
    status: str

    class Config:
        from_attributes = True


class InstallmentPlanOut(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    total_months: int
    monthly_amount: float
    interest_rate: float
    down_payment: float
    status: str
    created_at: datetime
    payments: list[InstallmentPaymentOut] = []

    class Config:
        from_attributes = True


class InstallmentCalculatorResponse(BaseModel):
    months: int
    monthly_amount: float
    total_amount: float
    interest_rate: float


class InstallmentPlanAdminOut(InstallmentPlanOut):
    order_code: str
    customer_name: str
    customer_phone: str
