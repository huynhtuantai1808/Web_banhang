"""Logic tạo kế hoạch trả góp cho đơn hàng. Mặc định 0% lãi suất (khớp với thông điệp
marketing 'trả góp 0% lãi suất' ở trang chủ) — có thể mở rộng interest_rate > 0 sau này
nếu cần tính lãi suất thực tế theo từng đối tác trả góp."""
import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.installment import InstallmentPlan, InstallmentPayment

ALLOWED_MONTHS = (3, 6, 9, 12)
DEFAULT_INTEREST_RATE = 0  # 0% lãi suất mặc định


def calculate_monthly_amount(total_amount: float, months: int, interest_rate: float = DEFAULT_INTEREST_RATE) -> float:
    """Số tiền phải trả mỗi kỳ (lãi suất đơn giản, chia đều — đủ dùng cho 0% lãi suất)."""
    total_with_interest = total_amount * (1 + interest_rate / 100)
    return round(total_with_interest / months, 2)


async def create_installment_plan(
    db: AsyncSession, order_id: uuid.UUID, total_amount: float, months: int, down_payment: float = 0
) -> InstallmentPlan:
    """Tạo InstallmentPlan + toàn bộ lịch InstallmentPayment cho từng kỳ (kỳ cuối gánh phần dư
    làm tròn để tổng các kỳ luôn khớp chính xác với total_amount - down_payment)."""
    if months not in ALLOWED_MONTHS:
        raise ValueError(f"Số tháng trả góp phải là một trong {ALLOWED_MONTHS}")

    remaining = total_amount - down_payment
    monthly_amount = calculate_monthly_amount(remaining, months)

    plan = InstallmentPlan(
        id=uuid.uuid4(),
        order_id=order_id,
        total_months=months,
        monthly_amount=monthly_amount,
        interest_rate=DEFAULT_INTEREST_RATE,
        down_payment=down_payment,
        status="active",
    )
    db.add(plan)
    await db.flush()

    today = date.today()
    accumulated = 0.0
    for period in range(1, months + 1):
        # Kỳ cuối = phần còn lại (tránh lệch vài đồng do làm tròn ở các kỳ trước)
        amount = round(remaining - accumulated, 2) if period == months else monthly_amount
        accumulated += amount
        due_date = date(today.year + (today.month + period - 1) // 12, (today.month + period - 1) % 12 + 1, 1)
        db.add(
            InstallmentPayment(
                id=uuid.uuid4(),
                plan_id=plan.id,
                period_no=period,
                due_date=due_date,
                amount=amount,
                status="unpaid",
            )
        )

    return plan
