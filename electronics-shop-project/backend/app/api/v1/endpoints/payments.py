from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.order import Order
from app.core.config import settings
from app.services import vnpay_service

router = APIRouter(prefix="/payments", tags=["Payments (Cổng thanh toán)"])


def _expected_amount_x100(order: Order) -> int:
    """VNPay gửi số tiền ở đơn vị 1/100 đồng — quy đổi ngược lại để so khớp chống giả mạo số tiền."""
    return int(round(float(order.final_amount) * 100))


async def _find_order(db: AsyncSession, order_code: str | None) -> Order | None:
    if not order_code:
        return None
    result = await db.execute(select(Order).where(Order.order_code == order_code))
    return result.scalar_one_or_none()


def _apply_payment_outcome(order: Order, params: dict) -> str:
    """Cập nhật trạng thái đơn hàng theo kết quả VNPay trả về. Trả về outcome: success | failed.
    Hàm THUẦN (không commit) — nơi gọi tự chịu trách nhiệm await db.commit()."""
    if params.get("vnp_ResponseCode") == "00":
        order.payment_status = "paid"
        order.status = "confirmed"
        order.gateway_transaction_id = params.get("vnp_TransactionNo")
        return "success"
    order.payment_status = "failed"
    return "failed"


@router.get("/vnpay/return")
async def vnpay_return(request: Request, db: AsyncSession = Depends(get_db)):
    """VNPay redirect TRÌNH DUYỆT khách hàng về đây sau khi thanh toán xong (thành công hoặc thất
    bại). Đây là kênh cập nhật trạng thái đơn hàng chính cho trải nghiệm người dùng (hiển thị ngay
    trang kết quả), nhưng phụ thuộc vào việc khách không đóng tab giữa chừng — xem thêm `/vnpay/ipn`
    là kênh server-to-server đáng tin cậy hơn, chạy độc lập với hành vi của khách hàng.

    Xác thực chữ ký + số tiền, cập nhật trạng thái đơn hàng, rồi redirect tiếp về Frontend kèm
    query param `payment` (success/failed/invalid/not_found) để trang kết quả hiển thị đúng.
    """
    params = dict(request.query_params)
    order_code = params.get("vnp_TxnRef")

    if not vnpay_service.verify_return_params(params):
        return RedirectResponse(f"{settings.FRONTEND_URL}/orders/result?payment=invalid&order_code={order_code}")

    order = await _find_order(db, order_code)
    if not order:
        return RedirectResponse(f"{settings.FRONTEND_URL}/orders/result?payment=not_found&order_code={order_code}")

    vnp_amount = params.get("vnp_Amount")
    if vnp_amount is None or int(vnp_amount) != _expected_amount_x100(order):
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/orders/result?payment=invalid&order_code={order.order_code}"
        )

    # Idempotent: nếu IPN (hoặc lần return trước đó) đã xác nhận thanh toán rồi thì không xử lý lại,
    # chỉ hiển thị lại kết quả đã có — tránh trường hợp khách bấm back/refresh trang return nhiều lần.
    if order.payment_status != "paid":
        _apply_payment_outcome(order, params)
        await db.commit()

    outcome = "success" if order.payment_status == "paid" else "failed"
    return RedirectResponse(
        f"{settings.FRONTEND_URL}/orders/result?payment={outcome}&order_code={order.order_code}"
    )


@router.get("/vnpay/ipn")
async def vnpay_ipn(request: Request, db: AsyncSession = Depends(get_db)):
    """Instant Payment Notification — VNPay gọi thẳng từ SERVER của VNPay tới BE (không qua trình
    duyệt khách hàng), nên đáng tin cậy hơn `/vnpay/return` rất nhiều: vẫn chạy được kể cả khi khách
    đóng tab/mất mạng ngay sau khi thanh toán xong trước khi trình duyệt kịp redirect về `/return`.

    QUAN TRỌNG: phải trả về đúng định dạng JSON `{"RspCode": ..., "Message": ...}` theo tài liệu
    VNPay — đây là hợp đồng bắt buộc để VNPay biết BE đã nhận và xử lý xong, nếu không VNPay sẽ
    gọi lại nhiều lần. Cấu hình URL này trong cổng merchant VNPay (mục IPN URL), trỏ tới:
    `{VNP_RETURN_URL nhưng đổi /return thành /ipn}` — xem VNP_RETURN_URL trong .env để suy ra domain.
    """
    params = dict(request.query_params)
    order_code = params.get("vnp_TxnRef")

    if not vnpay_service.verify_return_params(params):
        return JSONResponse({"RspCode": "97", "Message": "Invalid signature"})

    order = await _find_order(db, order_code)
    if not order:
        return JSONResponse({"RspCode": "01", "Message": "Order not found"})

    vnp_amount = params.get("vnp_Amount")
    if vnp_amount is None or int(vnp_amount) != _expected_amount_x100(order):
        return JSONResponse({"RspCode": "04", "Message": "Invalid amount"})

    if order.payment_status == "paid":
        # VNPay có thể gọi IPN nhiều lần cho cùng 1 giao dịch — phải trả lời "đã xác nhận rồi"
        # thay vì xử lý lại, đúng theo hợp đồng idempotency VNPay yêu cầu.
        return JSONResponse({"RspCode": "02", "Message": "Order already confirmed"})

    _apply_payment_outcome(order, params)
    await db.commit()

    return JSONResponse({"RspCode": "00", "Message": "Confirm Success"})
