"""Tính chiết khấu TỰ ĐỘNG áp dụng ngay khi đủ điều kiện (không cần khách nhập mã) — khác với
`promotion_service.py` (mã khuyến mãi, khách phải chủ động nhập).

Quy tắc trong `discount_rules` áp dụng theo hãng và/hoặc danh mục + số lượng tối thiểu mua trong
đơn. VD: "Mua từ 2 sản phẩm hãng Apple trở lên → giảm 5% cho các sản phẩm đó".
"""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.promotion import DiscountRule
from app.models.product import Product


def _rule_matches_product(rule: DiscountRule, product: Product) -> bool:
    """Rule áp dụng cho sản phẩm nếu KHỚP CẢ HAI điều kiện đã khai báo (bỏ qua điều kiện nào
    không khai báo — category_id/brand_id = None nghĩa là không giới hạn theo tiêu chí đó)."""
    if rule.category_id is not None and rule.category_id != product.category_id:
        return False
    if rule.brand_id is not None and rule.brand_id != product.brand_id:
        return False
    return True


def _rule_is_active_now(rule: DiscountRule) -> bool:
    now = datetime.now(timezone.utc)
    if rule.valid_from and now < rule.valid_from:
        return False
    if rule.valid_to and now > rule.valid_to:
        return False
    return True


async def compute_auto_discount(db: AsyncSession, cart_rows: list[tuple]) -> float:
    """cart_rows: list các tuple (CartItem, Product) — giống dữ liệu đã query sẵn ở orders.py/cart.py.

    Với mỗi sản phẩm trong giỏ, tìm rule khớp có `min_quantity` <= số lượng đang mua, ưu tiên rule
    có % giảm CAO NHẤT nếu có nhiều rule cùng khớp. Trả về tổng số tiền được giảm (VNĐ)."""
    result = await db.execute(select(DiscountRule))
    all_rules = result.scalars().all()
    active_rules = [r for r in all_rules if _rule_is_active_now(r)]

    if not active_rules:
        return 0.0

    total_discount = 0.0
    for cart_item, product in cart_rows:
        matching_rules = [
            r for r in active_rules
            if _rule_matches_product(r, product) and cart_item.quantity >= r.min_quantity
        ]
        if not matching_rules:
            continue

        best_rule = max(matching_rules, key=lambda r: float(r.discount_percent))
        unit_price = float(product.discount_price if product.discount_price else product.price)
        line_total = unit_price * cart_item.quantity
        total_discount += line_total * float(best_rule.discount_percent) / 100

    return round(total_discount, 2)
