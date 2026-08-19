import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.promotion import Promotion, PromotionCustomer
from app.models.customer import Customer
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.core.security import require_admin, require_customer
from app.schemas.promotion import (
    PromotionCreate, PromotionUpdate, PromotionOut, PromotionAssignRequest,
    ValidatePromoRequest, ValidatePromoResponse,
)
from app.services.promotion_service import validate_and_compute_discount, PromotionError, _is_targeted_promotion
from app.services.discount_rule_service import compute_auto_discount

router = APIRouter(prefix="/promotions", tags=["Promotions (Khuyến mãi)"])


async def _to_out(db: AsyncSession, promo: Promotion) -> PromotionOut:
    is_targeted = await _is_targeted_promotion(db, promo.id)
    return PromotionOut(
        id=promo.id, code=promo.code, name=promo.name, description=promo.description,
        discount_type=promo.discount_type, discount_value=float(promo.discount_value),
        start_date=promo.start_date, end_date=promo.end_date, max_usage=promo.max_usage,
        used_count=promo.used_count, is_active=promo.is_active, is_targeted=is_targeted,
    )


@router.get("", response_model=list[PromotionOut])
async def list_promotions(db: AsyncSession = Depends(get_db), _admin_id: str = Depends(require_admin)):
    """Danh sách toàn bộ mã khuyến mãi — chỉ Quản lý (admin)."""
    result = await db.execute(select(Promotion).order_by(Promotion.code))
    return [await _to_out(db, p) for p in result.scalars().all()]


@router.post("", response_model=PromotionOut, status_code=201)
async def create_promotion(
    payload: PromotionCreate, db: AsyncSession = Depends(get_db), _admin_id: str = Depends(require_admin)
):
    if payload.discount_type not in ("percent", "amount"):
        raise HTTPException(status_code=400, detail="discount_type phải là 'percent' hoặc 'amount'")

    existing = await db.execute(select(Promotion).where(Promotion.code == payload.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Mã khuyến mãi '{payload.code}' đã tồn tại")

    promo = Promotion(id=uuid.uuid4(), **payload.model_dump())
    db.add(promo)
    await db.commit()
    await db.refresh(promo)
    return await _to_out(db, promo)


@router.put("/{promotion_id}", response_model=PromotionOut)
async def update_promotion(
    promotion_id: uuid.UUID,
    payload: PromotionUpdate,
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    promo = await db.get(Promotion, promotion_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã khuyến mãi")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(promo, field, value)

    await db.commit()
    await db.refresh(promo)
    return await _to_out(db, promo)


@router.delete("/{promotion_id}", status_code=204)
async def deactivate_promotion(
    promotion_id: uuid.UUID, db: AsyncSession = Depends(get_db), _admin_id: str = Depends(require_admin)
):
    promo = await db.get(Promotion, promotion_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã khuyến mãi")
    promo.is_active = False
    await db.commit()


@router.post("/{promotion_id}/assign", status_code=201)
async def assign_promotion_to_customer(
    promotion_id: uuid.UUID,
    payload: PromotionAssignRequest,
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    """Phân bổ mã khuyến mãi cho MỘT khách hàng cụ thể theo số điện thoại — sau khi phân bổ,
    mã này sẽ CHỈ dùng được bởi (các) khách hàng đã được phân bổ, không còn công khai nữa."""
    promo = await db.get(Promotion, promotion_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã khuyến mãi")

    customer_result = await db.execute(select(Customer).where(Customer.phone == payload.customer_phone))
    customer = customer_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy khách hàng với SĐT '{payload.customer_phone}'")

    existing = await db.execute(
        select(PromotionCustomer).where(
            PromotionCustomer.promotion_id == promotion_id, PromotionCustomer.customer_id == customer.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Khách hàng này đã được phân bổ mã khuyến mãi này rồi")

    db.add(PromotionCustomer(id=uuid.uuid4(), promotion_id=promotion_id, customer_id=customer.id))
    await db.commit()
    return {"message": f"Đã phân bổ mã '{promo.code}' cho khách hàng {customer.full_name}"}


@router.get("/mine", response_model=list[PromotionOut])
async def list_my_promotions(db: AsyncSession = Depends(get_db), customer_id: str = Depends(require_customer)):
    """Danh sách mã khuyến mãi khách hàng đang đăng nhập có thể dùng: mã công khai đang hoạt động
    + mã đã được phân bổ riêng cho khách hàng này (chưa dùng)."""
    public_result = await db.execute(
        select(Promotion).where(
            Promotion.is_active.is_(True),
            ~Promotion.id.in_(select(PromotionCustomer.promotion_id)),
        )
    )
    assigned_result = await db.execute(
        select(Promotion)
        .join(PromotionCustomer, Promotion.id == PromotionCustomer.promotion_id)
        .where(
            PromotionCustomer.customer_id == uuid.UUID(customer_id),
            PromotionCustomer.is_used.is_(False),
            Promotion.is_active.is_(True),
        )
    )
    promos = list(public_result.scalars().all()) + list(assigned_result.scalars().all())
    return [await _to_out(db, p) for p in promos]


@router.post("/validate", response_model=ValidatePromoResponse)
async def validate_promo(
    payload: ValidatePromoRequest,
    db: AsyncSession = Depends(get_db),
    customer_id: str = Depends(require_customer),
):
    """Kiểm tra mã khuyến mãi trước khi đặt hàng — dùng ở trang checkout để hiển thị số tiền được
    giảm ngay, KHÔNG đánh dấu đã dùng (chỉ `POST /orders` với promo_code mới thực sự áp dụng)."""
    cart_result = await db.execute(select(Cart).where(Cart.customer_id == uuid.UUID(customer_id)))
    cart = cart_result.scalar_one_or_none()
    if not cart:
        return ValidatePromoResponse(valid=False, message="Giỏ hàng đang trống")

    items_result = await db.execute(
        select(CartItem, Product).join(Product, CartItem.product_id == Product.id).where(CartItem.cart_id == cart.id)
    )
    rows = items_result.all()
    order_total = sum(
        float(p.discount_price if p.discount_price else p.price) * ci.quantity for ci, p in rows
    )
    # Trừ chiết khấu tự động trước — khớp CHÍNH XÁC với cách POST /orders tính toán, tránh trường
    # hợp trang checkout hiển thị số tiền giảm khác với số tiền thực sự được áp dụng lúc đặt hàng.
    auto_discount = await compute_auto_discount(db, rows)
    order_total_after_auto_discount = order_total - auto_discount

    try:
        _, discount, _ = await validate_and_compute_discount(
            db, payload.code, uuid.UUID(customer_id), order_total_after_auto_discount
        )
        return ValidatePromoResponse(valid=True, discount_amount=discount, message="Áp dụng mã khuyến mãi thành công")
    except PromotionError as e:
        return ValidatePromoResponse(valid=False, message=str(e))
