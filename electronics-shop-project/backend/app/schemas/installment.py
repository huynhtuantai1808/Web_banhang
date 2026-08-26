import uuid
from datetime import date, datetime
from pydantic import BaseModel

CREDIT_CARD_MONTHS = (3, 6, 9, 12, 18, 24)
FINANCE_TENURES = (6, 12, 18, 24, 36)
FINANCE_CONFIG = {
    "down_payment_pct": 0.20,
    "annual_interest_rate": 0.18,
}


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
    type: str = "credit_card"          # credit_card | finance
    months: int
    monthly_amount: float
    total_amount: float
    interest_rate: float              # % phí chuyển đổi (credit_card) | % lãi/năm (finance)
    fee_amount: float = 0            # số tiền phí chuyển đổi (VNĐ)
    down_payment_amount: float = 0   # số tiền trả trước (VNĐ)
    loan_amount: float = 0           # khoản vay (VNĐ)
    total_interest: float = 0         # tổng lãi phải trả (VNĐ)


class InstallmentOption(BaseModel):
    type: str
    months: int
    conversion_fee: float | None = None      # credit_card
    fee_amount: float | None = None           # credit_card
    down_payment_pct: float | None = None    # finance
    down_payment_amount: float | None = None  # finance
    loan_amount: float | None = None         # finance
    annual_interest_rate: float | None = None  # finance
    monthly_interest_rate: float | None = None  # finance
    total_interest: float | None = None      # finance
    total_amount: float
    monthly_amount: float = 0
    monthly_payment: float | None = None     # finance alias


class InstallmentOptionsResponse(BaseModel):
    amount: float
    options: list[InstallmentOption]


class InstallmentPlanAdminOut(InstallmentPlanOut):
    order_code: str
    customer_name: str
    customer_phone: str
