import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, extract

from app.db.session import get_db
from app.models.order import Order, OrderItem
from app.models.customer import Customer
from app.models.product import Product
from app.models.promotion import Promotion
from app.models.installment import InstallmentPlan
from app.core.security import require_employee, require_permission
from app.schemas.order import OrderItemOut
from app.services.email_service import send_order_email

router = APIRouter(prefix="/admin/orders", tags=["Orders Management (Admin)"])

VALID_ORDER_STATUSES = ("pending", "confirmed", "shipping", "completed", "cancelled")


async def _build_admin_order_out(db: AsyncSession, order: Order) -> dict:
    customer = await db.get(Customer, order.customer_id)

    items_result = await db.execute(
        select(OrderItem, Product.name)
        .join(Product, OrderItem.product_id == Product.id)
        .where(OrderItem.order_id == order.id)
    )
    items = [
        OrderItemOut(product_id=i.product_id, product_name=n, unit_price=float(i.unit_price), quantity=i.quantity)
        for i, n in items_result.all()
    ]

    promotion_code = None
    if order.promotion_id:
        promo = await db.get(Promotion, order.promotion_id)
        promotion_code = promo.code if promo else None

    installment_result = await db.execute(
        select(InstallmentPlan.id).where(InstallmentPlan.order_id == order.id)
    )
    has_installment_plan = installment_result.scalar_one_or_none() is not None

    return {
        "id": order.id,
        "order_code": order.order_code,
        "customer_id": order.customer_id,
        "customer_name": customer.full_name if customer else "—",
        "customer_phone": customer.phone if customer else "—",
        "total_amount": float(order.total_amount),
        "discount_amount": float(order.discount_amount),
        "final_amount": float(order.final_amount),
        "payment_method": order.payment_method,
        "payment_gateway": order.payment_gateway,
        "payment_status": order.payment_status,
        "status": order.status,
        "shipping_address": order.shipping_address,
        "created_at": order.created_at,
        "items": items,
        "promotion_code": promotion_code,
        "has_installment_plan": has_installment_plan,
    }


@router.get("")
async def list_all_orders(
    keyword: str | None = Query(None, description="Tìm theo mã đơn, tên hoặc SĐT khách hàng"),
    status: str | None = Query(None, description="Lọc theo trạng thái đơn hàng"),
    payment_status: str | None = Query(None, description="Lọc theo trạng thái thanh toán"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_employee),
):
    """Toàn bộ đơn hàng của khách — để nhân viên/quản lý nắm được tình hình bán hàng."""
    stmt = select(Order).outerjoin(Customer, Order.customer_id == Customer.id)
    
    if status:
        stmt = stmt.where(Order.status == status)
    if payment_status:
        stmt = stmt.where(Order.payment_status == payment_status)
    if keyword:
        kw = f"%{keyword.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Order.order_code).like(kw),
                func.lower(Customer.full_name).like(kw),
                Customer.phone.like(kw)
            )
        )

    # Đếm tổng
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    stmt = stmt.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    orders = result.scalars().all()

    out = [await _build_admin_order_out(db, o) for o in orders]
    
    return {
        "items": out,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size else 0
    }


@router.get("/{order_id}")
async def get_order_detail(
    order_id: uuid.UUID, db: AsyncSession = Depends(get_db), _employee_id: str = Depends(require_employee)
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return await _build_admin_order_out(db, order)


@router.put("/{order_id}/status")
async def update_order_status(
    order_id: uuid.UUID,
    new_status: str = Query(..., description=f"Một trong {VALID_ORDER_STATUSES}"),
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_edit")),
):
    """Cập nhật trạng thái đơn hàng thủ công — yêu cầu quyền 'can_edit'.
    Lưu ý: nếu đơn có vận đơn (shipment) đang theo dõi, trạng thái sẽ tự đồng bộ theo shipment —
    chỉ dùng API này cho các trường hợp đặc biệt (huỷ đơn, xác nhận thủ công không qua vận chuyển)."""
    if new_status not in VALID_ORDER_STATUSES:
        raise HTTPException(status_code=400, detail=f"status phải là một trong {VALID_ORDER_STATUSES}")

    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    order.status = new_status
    await db.commit()
    return await _build_admin_order_out(db, order)


@router.get("/{order_id}/invoice")
async def get_order_invoice(
    order_id: uuid.UUID, db: AsyncSession = Depends(get_db), _employee_id: str = Depends(require_employee)
):
    """Lấy dữ liệu hóa đơn đầy đủ của một đơn hàng — để frontend tạo PDF."""
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    customer = await db.get(Customer, order.customer_id)

    items_result = await db.execute(
        select(OrderItem, Product.name, Product.product_code)
        .join(Product, OrderItem.product_id == Product.id)
        .where(OrderItem.order_id == order.id)
    )

    items = [
        {
            "product_name": name,
            "product_code": code,
            "unit_price": float(item.unit_price),
            "quantity": item.quantity,
            "subtotal": float(item.unit_price) * item.quantity,
        }
        for item, name, code in items_result.all()
    ]

    promotion = None
    promotion_code = None
    if order.promotion_id:
        promo = await db.get(Promotion, order.promotion_id)
        if promo:
            promotion = {"code": promo.code, "name": promo.name}
            promotion_code = promo.code

    return {
        "order_code": order.order_code,
        "customer_name": customer.full_name if customer else "—",
        "customer_phone": customer.phone if customer else "—",
        "customer_email": customer.email if customer else None,
        "shipping_address": order.shipping_address,
        "payment_method": order.payment_method,
        "payment_gateway": order.payment_gateway,
        "payment_status": order.payment_status,
        "status": order.status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "items": items,
        "subtotal": float(order.total_amount),
        "discount_amount": float(order.discount_amount),
        "final_amount": float(order.final_amount),
        "promotion_code": promotion_code,
    }


@router.post("/{order_id}/send-email")
async def send_order_email_endpoint(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_employee),
):
    """Gửi email hóa đơn đơn hàng cho khách."""
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    customer = await db.get(Customer, order.customer_id)
    if not customer or not customer.email:
        raise HTTPException(status_code=400, detail="Khách hàng không có email — không thể gửi mail")

    try:
        await send_order_email(
            to_email=customer.email,
            order_code=order.order_code,
            customer_name=customer.full_name,
            final_amount=float(order.final_amount),
            items=[
                {"product_name": str(row[1]), "quantity": row[0].quantity, "unit_price": float(row[0].unit_price)}
                for row in (await db.execute(
                    select(OrderItem, Product.name).join(Product, OrderItem.product_id == Product.id)
                    .where(OrderItem.order_id == order.id)
                )).all()
            ],
            shipping_address=order.shipping_address,
        )
        return {"message": f"Đã gửi email hóa đơn tới {customer.email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gửi email thất bại: {str(e)}")
