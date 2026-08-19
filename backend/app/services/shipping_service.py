"""Logic đồng bộ giữa trạng thái vận chuyển (Shipment) và trạng thái đơn hàng (Order).

Đây là điểm tích hợp CHUNG cho mọi đơn vị vận chuyển — dù cập nhật thủ công bởi nhân viên
(qua `PUT /admin/shipments/{id}/status`) hay tự động từ webhook của hãng vận chuyển thật
(`POST /webhooks/carrier`), đều đi qua cùng 1 hàm `apply_shipment_status()` để đảm bảo đơn hàng
luôn nhất quán với tình trạng giao hàng thực tế.

Hệ thống hoạt động đầy đủ ở chế độ "thủ công" (nhân viên tự nhập mã vận đơn + cập nhật trạng thái
theo thông tin từ hãng vận chuyển qua điện thoại/cổng đối tác) — không phụ thuộc vào việc có tài
khoản API thật. Ghi chú tích hợp API thật ở cuối file.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shipment import Shipment, ShipmentStatusLog
from app.models.order import Order

VALID_STATUSES = ("pending", "picked_up", "in_transit", "delivered", "failed", "returned")

# Trạng thái vận chuyển → trạng thái đơn hàng tương ứng (đồng bộ tự động)
_ORDER_STATUS_MAP = {
    "picked_up": "shipping",
    "in_transit": "shipping",
    "delivered": "completed",
    "failed": "cancelled",
    "returned": "cancelled",
}


async def apply_shipment_status(
    db: AsyncSession, shipment: Shipment, new_status: str, note: str | None = None
) -> Shipment:
    """Cập nhật trạng thái shipment + ghi log lịch sử + đồng bộ trạng thái đơn hàng tương ứng."""
    if new_status not in VALID_STATUSES:
        raise ValueError(f"Trạng thái không hợp lệ: {new_status}")

    shipment.status = new_status
    db.add(ShipmentStatusLog(id=uuid.uuid4(), shipment_id=shipment.id, status=new_status, note=note))

    order = await db.get(Order, shipment.order_id)
    if order:
        mapped_status = _ORDER_STATUS_MAP.get(new_status)
        if mapped_status:
            order.status = mapped_status
        # Giao thành công + đang thu tiền COD → coi như đã thanh toán (thu tiền khi giao hàng)
        if new_status == "delivered" and order.payment_gateway == "cod" and order.payment_status == "pending":
            order.payment_status = "paid"

    return shipment


# =====================================================================================
# GHI CHÚ TÍCH HỢP API THẬT (VD: Giao Hàng Nhanh — GHN)
# =====================================================================================
# 1. Đăng ký tài khoản GHN (https://5sao.ghn.dev hoặc https://api.ghn.vn) để lấy Token + ShopId.
# 2. Thêm GHN_TOKEN, GHN_SHOP_ID vào .env (xem core/config.py).
# 3. Viết hàm create_ghn_shipping_order(order) gọi POST tới
#    https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create
#    (đổi "dev-online-gateway" thành "online-gateway" khi lên production), header "Token": GHN_TOKEN,
#    "ShopId": GHN_SHOP_ID; trả về order_code của GHN → lưu vào Shipment.tracking_code.
# 4. Cấu hình Webhook URL trên cổng đối tác GHN trỏ về `POST /api/v1/webhooks/carrier` của bạn —
#    khi GHN cập nhật trạng thái đơn (lấy hàng, đang giao, đã giao...), họ sẽ tự động gọi webhook
#    này, và `apply_shipment_status()` ở trên sẽ tự đồng bộ vào Order tương ứng.
# 5. Cần viết thêm 1 hàm ánh xạ mã trạng thái riêng của GHN sang SHIPMENT_STATUSES ở schemas/shipment.py
#    (GHN có mã trạng thái chi tiết hơn — VD "ready_to_pick", "picking", "delivering", "delivered"...).
