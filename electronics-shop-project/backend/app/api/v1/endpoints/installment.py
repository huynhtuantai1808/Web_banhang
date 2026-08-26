import uuid
from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.order import Order
from app.models.customer import Customer
from app.models.installment import InstallmentPlan, InstallmentPayment
from app.core.security import require_customer, require_permission, require_employee
from app.schemas.installment import (
    InstallmentPlanOut, InstallmentPaymentOut, InstallmentCalculatorResponse,
    InstallmentPlanAdminOut, InstallmentOption, InstallmentOptionsResponse,
    CREDIT_CARD_MONTHS, FINANCE_TENURES, FINANCE_CONFIG,
)
from app.services.installment_service import (
    calculate_installment, calculate_installment_options,
    CONVERSION_FEE,
)

router = APIRouter(tags=["Installment (Trả góp)"])


def _build_payments_out(payments: list[InstallmentPayment]) -> list[InstallmentPaymentOut]:
    return [
        InstallmentPaymentOut(
            id=p.id, period_no=p.period_no, due_date=p.due_date, amount=float(p.amount), status=p.status
        )
        for p in payments
    ]


@router.get("/installment-options", response_model=InstallmentOptionsResponse)
async def get_installment_options(
    amount: float = Query(..., gt=0, description="Giá trị đơn hàng (VNĐ)"),
    inst_type: Annotated[str, Query(description="Loại trả góp: credit_card | finance")] = "credit_card",
):
    """Trả về bảng tất cả phương án trả góp cho một loại cụ thể.
    - credit_card: 0% lãi suất, có phí chuyển đổi trả góp (3/6/9/12/18/24 tháng).
    - finance: lãi suất trên dư nợ giảm dần, trả trước 20% (6/12/18/24/36 tháng).
    """
    if inst_type not in ("credit_card", "finance"):
        raise HTTPException(status_code=400, detail="inst_type phải là 'credit_card' hoặc 'finance'")

    options = calculate_installment_options(amount, inst_type)
    return InstallmentOptionsResponse(amount=amount, options=options)


@router.get("/installment-calculator", response_model=InstallmentCalculatorResponse)
async def installment_calculator(
    amount: float = Query(..., gt=0, description="Giá trị đơn hàng (VNĐ)"),
    months: int = Query(..., description="Số tháng trả góp"),
    inst_type: Annotated[str, Query(description="Loại: credit_card | finance")] = "credit_card",
):
    """Máy tính trả góp cho một phương án cụ thể (dùng khi khách đã chọn kỳ hạn)."""
    try:
        result = calculate_installment(amount, months, inst_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return InstallmentCalculatorResponse(
        type=inst_type,
        months=result["months"],
        monthly_amount=result["monthly_payment" if inst_type == "finance" else "monthly_amount"],
        total_amount=result["total_amount"],
        interest_rate=result.get("conversion_fee") or result.get("annual_interest_rate") or 0,
        fee_amount=result.get("fee_amount") or 0,
        down_payment_amount=result.get("down_payment_amount") or 0,
        loan_amount=result.get("loan_amount") or 0,
        total_interest=result.get("total_interest") or 0,
    )


@router.get("/installment-info")
async def get_installment_info():
    """Trả về thông tin cấu hình trả góp cho frontend hiển thị."""
    return {
        "credit_card": {
            "tenures": list(CREDIT_CARD_MONTHS),
            "fees": dict(zip(map(str, CREDIT_CARD_MONTHS), [CONVERSION_FEE[m] for m in CREDIT_CARD_MONTHS])),
        },
        "finance": {
            "tenures": list(FINANCE_TENURES),
            "down_payment_pct": FINANCE_CONFIG["down_payment_pct"] * 100,
            "annual_interest_rate": FINANCE_CONFIG["annual_interest_rate"] * 100,
            "monthly_interest_rate": round(FINANCE_CONFIG["annual_interest_rate"] / 12 * 100, 4),
        },
    }


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
