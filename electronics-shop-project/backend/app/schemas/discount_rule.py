import uuid
from datetime import datetime
from pydantic import BaseModel


class DiscountRuleCreate(BaseModel):
    category_id: int | None = None
    brand_id: int | None = None
    min_quantity: int = 1
    discount_percent: float
    valid_from: datetime | None = None
    valid_to: datetime | None = None


class DiscountRuleUpdate(BaseModel):
    category_id: int | None = None
    brand_id: int | None = None
    min_quantity: int | None = None
    discount_percent: float | None = None
    valid_from: datetime | None = None
    valid_to: datetime | None = None


class DiscountRuleOut(BaseModel):
    id: uuid.UUID
    category_id: int | None = None
    category_name: str | None = None
    brand_id: int | None = None
    brand_name: str | None = None
    min_quantity: int
    discount_percent: float
    valid_from: datetime | None = None
    valid_to: datetime | None = None

    class Config:
        from_attributes = True
