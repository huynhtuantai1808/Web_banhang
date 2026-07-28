import uuid
from datetime import datetime
from pydantic import BaseModel


class OrderCreate(BaseModel):
    shipping_address: str
    payment_gateway: str = "cod"       # "cod" hoặc "vnpay" — bị ép về "cod" nếu payment_method="installment"
    payment_method: str = "full"       # "full" (trả toàn bộ) hoặc "installment" (trả góp)
    installment_months: int | None = None  # bắt buộc nếu payment_method="installment": 3/6/9/12
    promo_code: str | None = None      # mã khuyến mãi (tuỳ chọn)


class OrderItemOut(BaseModel):
    product_id: uuid.UUID
    product_name: str
    unit_price: float
    quantity: int

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: uuid.UUID
    order_code: str
    total_amount: float
    discount_amount: float
    final_amount: float
    payment_method: str
    payment_gateway: str
    payment_status: str
    status: str
    shipping_address: str | None = None
    created_at: datetime
    items: list[OrderItemOut] = []
    promotion_code: str | None = None
    has_installment_plan: bool = False

    class Config:
        from_attributes = True


class OrderCreateResponse(BaseModel):
    order: OrderOut
    payment_url: str | None = None  # có giá trị nếu payment_gateway="vnpay", FE redirect sang đây


class GuestOrderItem(BaseModel):
    product_id: uuid.UUID
    quantity: int = 1


class GuestOrderCreate(BaseModel):
    """Đặt hàng không cần đăng ký tài khoản trước — khách điền thông tin ngay lúc đặt hàng."""
    full_name: str
    phone: str
    email: str | None = None
    shipping_address: str
    payment_gateway: str = "cod"  # "cod" hoặc "vnpay" — KHÔNG hỗ trợ trả góp cho khách vãng lai
    promo_code: str | None = None
    items: list[GuestOrderItem]
