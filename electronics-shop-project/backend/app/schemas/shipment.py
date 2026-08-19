import uuid
from datetime import datetime
from pydantic import BaseModel

# Danh sách trạng thái hợp lệ theo thứ tự vòng đời giao hàng
SHIPMENT_STATUSES = ("pending", "picked_up", "in_transit", "delivered", "failed", "returned")

# Danh sách đơn vị vận chuyển gợi ý (không giới hạn — carrier là free-text để linh hoạt thêm đối tác mới)
SUGGESTED_CARRIERS = ("Giao Hàng Nhanh", "Giao Hàng Tiết Kiệm", "Viettel Post", "Ninja Van", "Tự vận chuyển")


class ShipmentCreate(BaseModel):
    carrier: str
    tracking_code: str | None = None
    shipping_fee: float = 0
    note: str | None = None


class ShipmentStatusUpdate(BaseModel):
    status: str
    note: str | None = None


class ShipmentStatusLogOut(BaseModel):
    status: str
    note: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ShipmentOut(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    carrier: str
    tracking_code: str | None = None
    status: str
    shipping_fee: float
    note: str | None = None
    created_at: datetime
    updated_at: datetime
    logs: list[ShipmentStatusLogOut] = []

    class Config:
        from_attributes = True


class CarrierWebhookPayload(BaseModel):
    """Payload chung mà đơn vị vận chuyển (hoặc dịch vụ trung gian như Zapier/Make) gửi tới khi
    trạng thái đơn hàng bên vận chuyển thay đổi. Mỗi đơn vị vận chuyển thật có format riêng —
    khi tích hợp thật, viết thêm 1 hàm chuyển đổi payload gốc của họ sang format này trước khi
    gọi update_shipment_status()."""
    tracking_code: str
    status: str
    note: str | None = None
