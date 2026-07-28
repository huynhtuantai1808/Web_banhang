import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.order import Order
from app.models.customer import Customer
from app.models.installment import InstallmentPlan, InstallmentPayment
from app.core.security import require_customer, require_permission, require_employee
from app.schemas.installment import (
    InstallmentPlanOut, InstallmentPaymentOut, InstallmentCalculatorResponse, InstallmentPlanAdminOut,
)
from app.services.installment_service import calculate_monthly_amount, ALLOWED_MONTHS

router = APIRouter(tags=["Installment (Trả góp)"])


def _build_payments_out(payments: list[InstallmentPayment]) -> list[InstallmentPaymentOut]:
    return [
        InstallmentPaymentOut(
            id=p.id, period_no=p.period_no, due_date=p.due_date, amount=float(p.amount), status=p.status
        )
        for p in payments
    ]


@router.get("/installment-calculator", response_model=InstallmentCalculatorResponse)
async def installment_calculator(
    amount: float = Query(..., gt=0, description="Giá trị đơn hàng (VNĐ)"),
    months: int = Query(..., description=f"Số tháng trả góp, một trong {ALLOWED_MONTHS}"),
):
    """Máy tính trả góp công khai — không cần đăng nhập. Dùng ở trang chi tiết sản phẩm để hiển thị
    'Trả góp chỉ từ ...đ/tháng' trước khi khách quyết định mua."""
    if months not in ALLOWED_MONTHS:
        raise HTTPException(status_code=400, detail=f"months phải là một trong {ALLOWED_MONTHS}")

    monthly_amount = calculate_monthly_amount(amount, months)
    return InstallmentCalculatorResponse(
        months=months, monthly_amount=monthly_amount, total_amount=amount, interest_rate=0,
    )


@router.get("/orders/{order_id}/installment", response_model=InstallmentPlanOut)
async def get_installment_plan(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    customer_id: str = Depends(require_customer),
):
    """Xem lịch trả góp (từng kỳ, hạn thanh toán, trạng thái) của một đơn hàng — chỉ chủ đơn."""
    order = await db.get(Order, order_id)
    if not order or str(order.customer_id) != customer_id:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    plan_result = await db.execute(select(InstallmentPlan).where(InstallmentPlan.order_id == order_id))
    plan = plan_result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Đơn hàng này không có kế hoạch trả góp")

    payments_result = await db.execute(
        select(InstallmentPayment)
        .where(InstallmentPayment.plan_id == plan.id)
        .order_by(InstallmentPayment.period_no)
    )
    payments = payments_result.scalars().all()

    return InstallmentPlanOut(
        id=plan.id,
        order_id=plan.order_id,
        total_months=plan.total_months,
        monthly_amount=float(plan.monthly_amount),
        interest_rate=float(plan.interest_rate),
        down_payment=float(plan.down_payment),
        status=plan.status,
        created_at=plan.created_at,
        payments=_build_payments_out(payments),
    )


@router.get("/admin/installment-plans", response_model=list[InstallmentPlanAdminOut])
async def list_installment_plans_admin(
    db: AsyncSession = Depends(get_db), _employee_id: str = Depends(require_employee)
):
    """Toàn bộ kế hoạch trả góp — để nhân viên theo dõi kỳ nào sắp tới hạn/đã quá hạn thu tiền."""
    result = await db.execute(select(InstallmentPlan).order_by(InstallmentPlan.created_at.desc()))
    plans = result.scalars().all()

    out = []
    for plan in plans:
        order = await db.get(Order, plan.order_id)
        customer = await db.get(Customer, order.customer_id) if order else None

        payments_result = await db.execute(
            select(InstallmentPayment).where(InstallmentPayment.plan_id == plan.id).order_by(InstallmentPayment.period_no)
        )
        payments = payments_result.scalars().all()

        out.append(
            InstallmentPlanAdminOut(
                id=plan.id,
                order_id=plan.order_id,
                order_code=order.order_code if order else "—",
                customer_name=customer.full_name if customer else "—",
                customer_phone=customer.phone if customer else "—",
                total_months=plan.total_months,
                monthly_amount=float(plan.monthly_amount),
                interest_rate=float(plan.interest_rate),
                down_payment=float(plan.down_payment),
                status=plan.status,
                created_at=plan.created_at,
                payments=_build_payments_out(payments),
            )
        )
    return out


@router.put("/admin/installment-payments/{payment_id}/mark-paid", response_model=InstallmentPaymentOut)
async def mark_installment_payment_paid(
    payment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_edit")),
):
    """Đánh dấu ĐÃ THU TIỀN cho 1 kỳ trả góp cụ thể — yêu cầu quyền 'can_edit'. Nếu đây là kỳ cuối
    cùng của kế hoạch, tự động chuyển InstallmentPlan.status sang 'completed'."""
    payment = await db.get(InstallmentPayment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy kỳ trả góp")

    payment.status = "paid"
    payment.paid_at = datetime.now(timezone.utc)

    remaining_result = await db.execute(
        select(InstallmentPayment).where(
            InstallmentPayment.plan_id == payment.plan_id, InstallmentPayment.status != "paid"
        )
    )
    if not remaining_result.scalars().first():
        plan = await db.get(InstallmentPlan, payment.plan_id)
        if plan:
            plan.status = "completed"

    await db.commit()
    await db.refresh(payment)
    return InstallmentPaymentOut(
        id=payment.id, period_no=payment.period_no, due_date=payment.due_date,
        amount=float(payment.amount), status=payment.status,
    )
