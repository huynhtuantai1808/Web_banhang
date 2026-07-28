import uuid
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.shipment import Shipment, ShipmentStatusLog
from app.models.order import Order
from app.core.security import require_customer, require_permission, require_employee
from app.core.config import settings
from app.schemas.shipment import (
    ShipmentCreate, ShipmentStatusUpdate, ShipmentOut, ShipmentStatusLogOut, CarrierWebhookPayload,
)
from app.services.shipping_service import apply_shipment_status

router = APIRouter(tags=["Shipping (Vận chuyển)"])


async def _to_out(db: AsyncSession, shipment: Shipment) -> ShipmentOut:
    logs_result = await db.execute(
        select(ShipmentStatusLog)
        .where(ShipmentStatusLog.shipment_id == shipment.id)
        .order_by(ShipmentStatusLog.created_at.desc())
    )
    logs = logs_result.scalars().all()
    return ShipmentOut(
        id=shipment.id,
        order_id=shipment.order_id,
        carrier=shipment.carrier,
        tracking_code=shipment.tracking_code,
        status=shipment.status,
        shipping_fee=float(shipment.shipping_fee),
        note=shipment.note,
        created_at=shipment.created_at,
        updated_at=shipment.updated_at,
        logs=[ShipmentStatusLogOut(status=l.status, note=l.note, created_at=l.created_at) for l in logs],
    )


@router.post("/admin/orders/{order_id}/shipment", response_model=ShipmentOut, status_code=201)
async def create_shipment(
    order_id: uuid.UUID,
    payload: ShipmentCreate,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_edit")),
):
    """Gán đơn vị vận chuyển + mã vận đơn cho 1 đơn hàng — dành cho nhân viên có quyền 'can_edit'."""
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    existing = await db.execute(select(Shipment).where(Shipment.order_id == order_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Đơn hàng này đã có thông tin vận chuyển")

    shipment = Shipment(id=uuid.uuid4(), order_id=order_id, **payload.model_dump())
    db.add(shipment)
    await db.flush()
    db.add(ShipmentStatusLog(id=uuid.uuid4(), shipment_id=shipment.id, status="pending", note="Khởi tạo vận đơn"))

    await db.commit()
    await db.refresh(shipment)
    return await _to_out(db, shipment)


@router.put("/admin/shipments/{shipment_id}/status", response_model=ShipmentOut)
async def update_shipment_status(
    shipment_id: uuid.UUID,
    payload: ShipmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_edit")),
):
    """Cập nhật trạng thái giao hàng thủ công (theo thông tin từ hãng vận chuyển qua điện thoại/
    cổng đối tác) — tự động đồng bộ sang trạng thái đơn hàng tương ứng."""
    shipment = await db.get(Shipment, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin vận chuyển")

    try:
        await apply_shipment_status(db, shipment, payload.status, payload.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.commit()
    await db.refresh(shipment)
    return await _to_out(db, shipment)


@router.get("/admin/shipments", response_model=list[ShipmentOut])
async def list_shipments(db: AsyncSession = Depends(get_db), _employee_id: str = Depends(require_employee)):
    """Danh sách toàn bộ vận đơn — mọi nhân viên đã đăng nhập đều xem được (để hỗ trợ khách)."""
    result = await db.execute(select(Shipment).order_by(Shipment.created_at.desc()))
    return [await _to_out(db, s) for s in result.scalars().all()]


@router.get("/admin/orders/{order_id}/shipment", response_model=ShipmentOut)
async def get_shipment_for_admin(
    order_id: uuid.UUID, db: AsyncSession = Depends(get_db), _employee_id: str = Depends(require_employee)
):
    """Nhân viên xem thông tin vận chuyển của 1 đơn hàng bất kỳ (để hỗ trợ khách) — khác với
    `GET /orders/{order_id}/shipment` ở trên vốn chỉ dành cho khách hàng xem đơn của chính mình."""
    result = await db.execute(select(Shipment).where(Shipment.order_id == order_id))
    shipment = result.scalar_one_or_none()
    if not shipment:
        raise HTTPException(status_code=404, detail="Đơn hàng chưa có thông tin vận chuyển")
    return await _to_out(db, shipment)


@router.get("/orders/{order_id}/shipment", response_model=ShipmentOut)
async def get_my_shipment(
    order_id: uuid.UUID, db: AsyncSession = Depends(get_db), customer_id: str = Depends(require_customer)
):
    """Khách hàng xem thông tin/tình trạng vận chuyển của đơn hàng mình — chỉ chủ đơn."""
    order = await db.get(Order, order_id)
    if not order or str(order.customer_id) != customer_id:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    result = await db.execute(select(Shipment).where(Shipment.order_id == order_id))
    shipment = result.scalar_one_or_none()
    if not shipment:
        raise HTTPException(status_code=404, detail="Đơn hàng chưa có thông tin vận chuyển")

    return await _to_out(db, shipment)


@router.post("/webhooks/carrier")
async def carrier_webhook(
    payload: CarrierWebhookPayload,
    db: AsyncSession = Depends(get_db),
    x_webhook_secret: str | None = Header(None),
):
    """Điểm nhận cập nhật trạng thái TỰ ĐỘNG từ đơn vị vận chuyển thật (hoặc dịch vụ trung gian
    như Zapier/Make nếu đơn vị vận chuyển không hỗ trợ webhook trực tiếp).

    Bảo mật bằng secret cố định qua header `X-Webhook-Secret` (đặt trong `.env`:
    `CARRIER_WEBHOOK_SECRET`) — KHÔNG dùng JWT vì đây là hệ thống bên ngoài, không phải người dùng
    đăng nhập. Khi tích hợp 1 đơn vị vận chuyển thật có cơ chế xác thực riêng (VD chữ ký HMAC),
    thay việc kiểm tra header này bằng cơ chế xác thực tương ứng của họ.
    """
    if x_webhook_secret != settings.CARRIER_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Webhook secret không hợp lệ")

    result = await db.execute(select(Shipment).where(Shipment.tracking_code == payload.tracking_code))
    shipment = result.scalar_one_or_none()
    if not shipment:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy vận đơn với mã '{payload.tracking_code}'")

    try:
        await apply_shipment_status(db, shipment, payload.status, payload.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.commit()
    return {"message": "Đã cập nhật trạng thái vận chuyển"}
