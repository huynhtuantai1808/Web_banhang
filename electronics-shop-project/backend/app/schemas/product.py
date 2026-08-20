import uuid
from pydantic import BaseModel


class ProductCreate(BaseModel):
    product_code: str
    name: str
    description: str | None = None
    long_description: str | None = None
    video_url: str | None = None
    brand: str | None = None
    brand_id: int | None = None
    category: str | None = None
    category_id: int | None = None
    color: str | None = None
    material: str | None = None
    size_dimension: str | None = None
    specification: dict | None = None
    price: float
    discount_price: float | None = None
    is_installment_eligible: bool = True


class ProductOut(BaseModel):
    id: uuid.UUID
    product_code: str
    name: str
    description: str | None = None
    long_description: str | None = None
    video_url: str | None = None
    brand: str | None = None
    category: str | None = None
    color: str | None = None
    material: str | None = None
    size_dimension: str | None = None
    specification: dict | None = None
    price: float
    discount_price: float | None = None
    is_installment_eligible: bool
    status: str
    primary_image_url: str | None = None
    average_rating: float | None = None
    review_count: int | None = None

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    rating: int
    comment: str | None = None


class ReviewOut(BaseModel):
    id: int
    product_id: uuid.UUID
    customer_id: uuid.UUID
    customer_name: str | None = None
    rating: int
    comment: str | None = None
    created_at: str

    class Config:
        from_attributes = True


class ProductFilter(BaseModel):
    keyword: str | None = None
    brand: str | None = None
    category: str | None = None
    feature: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    page: int = 1
    page_size: int = 20
