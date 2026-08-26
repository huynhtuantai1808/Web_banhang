"""Logic trả góp 0% lãi suất — có phí chuyển đổi trả góp (conversion fee).

CÓ HAI LOẠI TRẢ GÓP:

1. THẺ TÍN DỤNG (type=credit_card):
   - 0% lãi suất, có phí chuyển đổi trả góp.
   - Bảng phí chuyển đổi theo kỳ hạn:
       3 tháng → 2%, 6 tháng → 3%, 9 tháng → 4%,
       12 tháng → 5%, 18 tháng → 7%, 24 tháng → 9%
   - Cách tính: Phí = Giá × %phí → Tổng = Giá + Phí → Mỗi tháng = Tổng / Kỳ hạn

2. CÔNG TY TÀI CHÍNH (type=finance):
   - Khách trả trước % của giá trị sản phẩm.
   - Công ty tài chính tài trợ phần còn lại (khoản vay).
   - Lãi suất trên dư nợ giảm dần.
   - Kỳ hạn: 6/12/18/24/36 tháng.
   - Công thức: Payment = P × r × (1+r)^n / ((1+r)^n - 1)
     trong đó P = giá - trả trước, r = lãi suất/tháng, n = số tháng
"""
import uuid
import math
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.installment import InstallmentPlan, InstallmentPayment

# ── Thẻ tín dụng ──────────────────────────────────────────────
CREDIT_CARD_MONTHS = (3, 6, 9, 12, 18, 24)

# Bảng phí chuyển đổi trả góp (% trên giá trị đơn hàng)
CONVERSION_FEE: dict[int, float] = {
    3:  2.0,
    6:  3.0,
    9:  4.0,
    12: 5.0,
    18: 7.0,
    24: 9.0,
}

# ── Công ty tài chính ─────────────────────────────────────────
FINANCE_TENURES = (6, 12, 18, 24, 36)

# Cấu hình công ty tài chính
FINANCE_CONFIG = {
    "down_payment_pct": 0.20,     # khách trả trước 20% giá trị
    "annual_interest_rate": 0.18,  # 18%/năm → 1.5%/tháng
}

ALLOWED_MONTHS = (3, 6, 9, 12, 18, 24, 36)


# ── Thẻ tín dụng ────────────────────────────────────────────────

def get_conversion_fee(months: int) -> float:
    if months not in CREDIT_CARD_MONTHS:
        raise ValueError(f"Kỳ hạn thẻ tín dụng không hợp lệ: {months}")
    return CONVERSION_FEE[months]


def calculate_credit_card(amount: float, months: int) -> dict:
    """Tính trả góp thẻ tín dụng (0% lãi, có phí chuyển đổi)."""
    fee_pct = get_conversion_fee(months)
    fee_amount = round(amount * fee_pct / 100, 2)
    total_amount = round(amount + fee_amount, 2)
    monthly_amount = round(total_amount / months, 2)
    return {
        "type": "credit_card",
        "months": months,
        "conversion_fee": fee_pct,
        "fee_amount": fee_amount,
        "total_amount": total_amount,
        "monthly_amount": monthly_amount,
    }


# ── Công ty tài chính ─────────────────────────────────────────

def calculate_finance(amount: float, months: int) -> dict:
    """Tính trả góp qua công ty tài chính (lãi suất trên dư nợ giảm dần).

    Công thức tính đều hàng tháng (constant payment):
        Payment = P × r × (1+r)^n / ((1+r)^n - 1)
        P = amount × (1 - down_payment_pct)   (khoản vay)
        r = annual_interest_rate / 12          (lãi suất/tháng)
        n = months
    """
    if months not in FINANCE_TENURES:
        raise ValueError(f"Kỳ hạn công ty tài chính không hợp lệ: {months}")

    cfg = FINANCE_CONFIG
    down_payment_amount = round(amount * cfg["down_payment_pct"], 2)
    loan_amount = round(amount - down_payment_amount, 2)
    annual_rate = cfg["annual_interest_rate"]
    monthly_rate = annual_rate / 12

    if monthly_rate == 0:
        monthly_payment = round(loan_amount / months, 2)
    else:
        factor = math.pow(1 + monthly_rate, months)
        monthly_payment = round(loan_amount * monthly_rate * factor / (factor - 1), 2)

    total_interest = round(monthly_payment * months - loan_amount, 2)
    total_amount = round(loan_amount + total_interest, 2)

    return {
        "type": "finance",
        "months": months,
        "down_payment_pct": cfg["down_payment_pct"] * 100,
        "down_payment_amount": down_payment_amount,
        "loan_amount": loan_amount,
        "annual_interest_rate": annual_rate * 100,
        "monthly_interest_rate": monthly_rate * 100,
        "total_interest": total_interest,
        "total_amount": total_amount,
        "monthly_payment": monthly_payment,
    }


# ── Tổng hợp ──────────────────────────────────────────────────

def calculate_installment(amount: float, months: int, inst_type: str = "credit_card") -> dict:
    if inst_type == "finance":
        return calculate_finance(amount, months)
    return calculate_credit_card(amount, months)


def calculate_installment_options(amount: float, inst_type: str = "credit_card") -> list[dict]:
    """Trả về bảng tất cả phương án trả góp cho một loại."""
    if inst_type == "finance":
        return [calculate_finance(amount, m) for m in FINANCE_TENURES]
    return [calculate_credit_card(amount, m) for m in CREDIT_CARD_MONTHS]


# Giữ tên cũ để tương thích ngược
def calculate_monthly_amount(total_amount: float, months: int) -> float:
    return calculate_installment(total_amount, months)["monthly_amount"]


# ── Tạo plan ──────────────────────────────────────────────────

async def create_installment_plan(
    db: AsyncSession,
    order_id: uuid.UUID,
    total_amount: float,
    months: int,
    inst_type: str = "credit_card",
    down_payment: float = 0,
) -> InstallmentPlan:
    if inst_type == "finance":
        result = calculate_finance(total_amount, months)
        loan_amount = result["loan_amount"]
        monthly = result["monthly_payment"]
        interest_rate = result["annual_interest_rate"]  # lưu vào DB để admin xem
    else:
        result = calculate_credit_card(total_amount, months)
        loan_amount = result["total_amount"]
        monthly = result["monthly_amount"]
        interest_rate = result["conversion_fee"]  # phí chuyển đổi

    remaining = loan_amount - down_payment
    first_payment = round(remaining / months, 2)

    plan = InstallmentPlan(
        id=uuid.uuid4(),
        order_id=order_id,
        total_months=months,
        monthly_amount=first_payment,
        interest_rate=interest_rate,
        down_payment=down_payment,
        status="active",
    )
    db.add(plan)
    await db.flush()

    today = date.today()
    accumulated = 0.0
    for period in range(1, months + 1):
        amount = round(remaining - accumulated, 2) if period == months else first_payment
        accumulated += amount
        due_date = date(today.year + (today.month + period - 1) // 12,
                        (today.month + period - 1) % 12 + 1, 1)
        db.add(InstallmentPayment(
            id=uuid.uuid4(),
            plan_id=plan.id,
            period_no=period,
            due_date=due_date,
            amount=amount,
            status="unpaid",
        ))

    return plan
