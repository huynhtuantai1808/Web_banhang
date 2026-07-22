import uuid
from pydantic import BaseModel


class CartItemAdd(BaseModel):
    product_id: uuid.UUID
    quantity: int = 1


class CartItemOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    product_price: float
    product_discount_price: float | None = None
    product_image_url: str | None = None
    quantity: int

    class Config:
        from_attributes = True


class CartOut(BaseModel):
    items: list[CartItemOut]
    total_amount: float
