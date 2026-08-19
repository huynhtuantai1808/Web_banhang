"""Logic kiểm tra & áp dụng mã khuyến mãi (promotions) cho khách hàng.

Quy tắc "công khai" vs "riêng cho khách hàng":
- Nếu 1 promotion KHÔNG có dòng nào trong promotion_customer → coi là mã CÔNG KHAI, ai nhập đúng
  mã cũng dùng được (miễn còn hạn, còn lượt).
- Nếu 1 promotion CÓ ít nhất 1 dòng trong promotion_customer → coi là mã ĐƯỢC PHÂN BỔ RIÊNG, chỉ
  những khách hàng có dòng promotion_customer tương ứng (và chưa dùng) mới áp dụng được.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.promotion import Promotion, PromotionCustomer


class PromotionError(Exception):
    """Lỗi nghiệp vụ khi mã khuyến mãi không hợp lệ — nơi gọi tự chuyển thành HTTPException 400."""


async def _is_targeted_promotion(db: AsyncSession, promotion_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(func.count()).select_from(PromotionCustomer).where(PromotionCustomer.promotion_id == promotion_id)
    )
    return (result.scalar() or 0) > 0


async def validate_and_compute_discount(
    db: AsyncSession, code: str, customer_id: uuid.UUID, order_total: float
) -> tuple[Promotion, float, PromotionCustomer | None]:
    """Kiểm tra mã khuyến mãi có áp dụng được cho khách hàng này không, trả về
    (promotion, discount_amount, promotion_customer_row_nếu_có).

    Ném PromotionError với thông báo tiếng Việt rõ ràng nếu không hợp lệ.
    """
    result = await db.execute(select(Promotion).where(Promotion.code == code))
    promotion = result.scalar_one_or_none()
    if not promotion:
        raise PromotionError(f"Mã khuyến mãi '{code}' không tồn tại")

    if not promotion.is_active:
        raise PromotionError("Mã khuyến mãi này hiện không còn hoạt động")

    now = datetime.now(timezone.utc)
    if promotion.start_date and now < promotion.start_date:
        raise PromotionError("Mã khuyến mãi chưa tới ngày áp dụng")
    if promotion.end_date and now > promotion.end_date:
        raise PromotionError("Mã khuyến mãi đã hết hạn")
    if promotion.max_usage is not None and promotion.used_count >= promotion.max_usage:
        raise PromotionError("Mã khuyến mãi đã hết lượt sử dụng")

    promo_customer_row: PromotionCustomer | None = None
    is_targeted = await _is_targeted_promotion(db, promotion.id)
    if is_targeted:
        pc_result = await db.execute(
            select(PromotionCustomer).where(
                PromotionCustomer.promotion_id == promotion.id,
                PromotionCustomer.customer_id == customer_id,
            )
        )
        promo_customer_row = pc_result.scalar_one_or_none()
        if not promo_customer_row:
            raise PromotionError("Mã khuyến mãi này không áp dụng cho tài khoản của bạn")
        if promo_customer_row.is_used:
            raise PromotionError("Bạn đã sử dụng mã khuyến mãi này rồi")

    if promotion.discount_type == "percent":
        discount = order_total * float(promotion.discount_value) / 100
    else:
        discount = float(promotion.discount_value)

    # Không cho giảm nhiều hơn tổng giá trị đơn hàng
    discount = min(discount, order_total)

    return promotion, discount, promo_customer_row


async def mark_promotion_used(db: AsyncSession, promotion: Promotion, promo_customer_row: PromotionCustomer | None):
    """Ghi nhận đã dùng mã — gọi SAU KHI đơn hàng đã tạo thành công (không rollback được nếu đơn lỗi)."""
    promotion.used_count += 1
    if promo_customer_row:
        promo_customer_row.is_used = True
        promo_customer_row.used_at = datetime.now(timezone.utc)
