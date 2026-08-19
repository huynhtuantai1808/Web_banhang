import uuid
from datetime import datetime
from pydantic import BaseModel


class PromotionCreate(BaseModel):
    code: str
    name: str
    description: str | None = None
    discount_type: str  # "percent" | "amount"
    discount_value: float
    start_date: datetime | None = None
    end_date: datetime | None = None
    max_usage: int | None = None


class PromotionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    discount_type: str | None = None
    discount_value: float | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    max_usage: int | None = None
    is_active: bool | None = None


class PromotionOut(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: str | None = None
    discount_type: str
    discount_value: float
    start_date: datetime | None = None
    end_date: datetime | None = None
    max_usage: int | None = None
    used_count: int
    is_active: bool
    is_targeted: bool = False  # True nếu đã phân bổ riêng cho khách hàng cụ thể (không dùng công khai)

    class Config:
        from_attributes = True


class PromotionAssignRequest(BaseModel):
    customer_phone: str  # tra theo SĐT cho dễ dùng ở màn quản trị thay vì phải biết UUID


class ValidatePromoRequest(BaseModel):
    code: str


class ValidatePromoResponse(BaseModel):
    valid: bool
    discount_amount: float = 0
    message: str = ""
