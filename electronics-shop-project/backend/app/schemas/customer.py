import uuid
from datetime import datetime
from pydantic import BaseModel


class CustomerOut(BaseModel):
    id: uuid.UUID
    customer_code: str
    full_name: str
    phone: str
    email: str | None = None
    address: str | None = None
    is_verified: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerDetailOut(CustomerOut):
    total_orders: int = 0
    total_spent: float = 0


class CustomerUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    address: str | None = None
    is_active: bool | None = None
