"""
Tích hợp cổng thanh toán VNPay (chuẩn phổ biến nhất tại VN cho website bán hàng).

Tài liệu chính thức: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
Luồng hoạt động:
  1. BE tạo URL thanh toán (build_payment_url) kèm chữ ký HMAC-SHA512, redirect khách sang VNPay.
  2. Khách nhập thẻ/quét QR trên trang VNPay (sandbox hoặc thật).
  3. VNPay redirect khách về VNP_RETURN_URL kèm query params + chữ ký riêng.
  4. BE xác thực chữ ký (verify_return_params) rồi cập nhật trạng thái đơn hàng.

Nếu chưa cấu hình VNP_TMN_CODE/VNP_HASH_SECRET trong .env, is_configured() trả về False —
API tạo đơn hàng sẽ chặn không cho chọn cổng "vnpay", chỉ cho phép "cod".
"""
import hashlib
import hmac
import urllib.parse
from datetime import datetime

from app.core.config import settings


def is_configured() -> bool:
    return bool(settings.VNP_TMN_CODE and settings.VNP_HASH_SECRET)


def _sign(data: str) -> str:
    return hmac.new(
        settings.VNP_HASH_SECRET.encode("utf-8"),
        data.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()


def build_payment_url(order_code: str, amount_vnd: float, order_desc: str, client_ip: str) -> str:
    """Tạo URL thanh toán VNPay cho một đơn hàng. amount_vnd là số tiền VNĐ (KHÔNG nhân 100 —
    hàm tự nhân 100 theo yêu cầu của VNPay: đơn vị nhỏ nhất là 1/100 đồng)."""
    if not is_configured():
        raise RuntimeError("VNPay chưa được cấu hình (thiếu VNP_TMN_CODE/VNP_HASH_SECRET trong .env)")

    now = datetime.now()
    params = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": settings.VNP_TMN_CODE,
        "vnp_Amount": str(int(round(amount_vnd * 100))),
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": order_code,
        "vnp_OrderInfo": order_desc,
        "vnp_OrderType": "other",
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": settings.VNP_RETURN_URL,
        "vnp_IpAddr": client_ip or "127.0.0.1",
        "vnp_CreateDate": now.strftime("%Y%m%d%H%M%S"),
    }

    # VNPay yêu cầu sắp xếp tham số theo thứ tự alphabet trước khi ký
    sorted_items = sorted(params.items())
    query_string = urllib.parse.urlencode(sorted_items, quote_via=urllib.parse.quote_plus)
    secure_hash = _sign(query_string)

    return f"{settings.VNP_PAY_URL}?{query_string}&vnp_SecureHash={secure_hash}"


def verify_return_params(params: dict) -> bool:
    """Xác thực chữ ký VNPay gửi kèm khi redirect khách hàng quay lại sau thanh toán.
    Trả về True nếu chữ ký hợp lệ (không có nghĩa là thanh toán thành công — cần kiểm tra
    thêm vnp_ResponseCode == '00' ở nơi gọi hàm này)."""
    if not is_configured():
        return False

    received_hash = params.get("vnp_SecureHash", "")
    filtered = {k: v for k, v in params.items() if k not in ("vnp_SecureHash", "vnp_SecureHashType")}
    sorted_items = sorted(filtered.items())
    query_string = urllib.parse.urlencode(sorted_items, quote_via=urllib.parse.quote_plus)
    expected_hash = _sign(query_string)

    return hmac.compare_digest(received_hash.lower(), expected_hash.lower())
