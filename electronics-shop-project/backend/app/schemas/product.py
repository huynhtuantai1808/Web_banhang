import uuid
from pydantic import BaseModel


class ProductCreate(BaseModel):
    product_code: str
    name: str
    description: str | None = None
    brand_id: int | None = None
    category_id: int | None = None
    color: str | None = None
    material: str | None = None
    size_dimension: str | None = None
    specification: dict | None = None
    price: float
    discount_price: float | None = None
    is_installment_eligible: bool = True


class ProductOut(ProductCreate):
    id: uuid.UUID
    status: str

    class Config:
        from_attributes = True


class ProductFilter(BaseModel):
    keyword: str | None = None
    brand_id: int | None = None
    category_id: int | None = None
    min_price: float | None = None
    max_price: float | None = None
    page: int = 1
    page_size: int = 20
