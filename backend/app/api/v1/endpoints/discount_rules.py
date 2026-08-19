import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.promotion import DiscountRule
from app.models.product import Category, Brand
from app.core.security import require_permission
from app.schemas.discount_rule import DiscountRuleCreate, DiscountRuleUpdate, DiscountRuleOut

router = APIRouter(prefix="/discount-rules", tags=["Discount Rules (Chiết khấu tự động)"])


async def _to_out(db: AsyncSession, rule: DiscountRule) -> DiscountRuleOut:
    category_name = None
    brand_name = None
    if rule.category_id:
        cat = await db.get(Category, rule.category_id)
        category_name = cat.name if cat else None
    if rule.brand_id:
        brand = await db.get(Brand, rule.brand_id)
        brand_name = brand.name if brand else None

    return DiscountRuleOut(
        id=rule.id,
        category_id=rule.category_id,
        category_name=category_name,
        brand_id=rule.brand_id,
        brand_name=brand_name,
        min_quantity=rule.min_quantity,
        discount_percent=float(rule.discount_percent),
        valid_from=rule.valid_from,
        valid_to=rule.valid_to,
    )


@router.get("", response_model=list[DiscountRuleOut])
async def list_discount_rules(db: AsyncSession = Depends(get_db), _employee_id: str = Depends(require_permission("can_edit"))):
    """Danh sách quy tắc chiết khấu tự động — chỉ nhân viên có quyền quản lý sản phẩm mới xem được."""
    result = await db.execute(select(DiscountRule))
    return [await _to_out(db, r) for r in result.scalars().all()]


@router.post("", response_model=DiscountRuleOut, status_code=201)
async def create_discount_rule(
    payload: DiscountRuleCreate,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_create")),
):
    if payload.category_id is None and payload.brand_id is None:
        raise HTTPException(status_code=400, detail="Phải chỉ định ít nhất 1 trong 2: category_id hoặc brand_id")
    if not (0 < payload.discount_percent <= 100):
        raise HTTPException(status_code=400, detail="discount_percent phải trong khoảng (0, 100]")

    rule = DiscountRule(id=uuid.uuid4(), **payload.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return await _to_out(db, rule)


@router.put("/{rule_id}", response_model=DiscountRuleOut)
async def update_discount_rule(
    rule_id: uuid.UUID,
    payload: DiscountRuleUpdate,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_edit")),
):
    rule = await db.get(DiscountRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy tắc chiết khấu")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)

    await db.commit()
    await db.refresh(rule)
    return await _to_out(db, rule)


@router.delete("/{rule_id}", status_code=204)
async def delete_discount_rule(
    rule_id: uuid.UUID, db: AsyncSession = Depends(get_db), _employee_id: str = Depends(require_permission("can_delete"))
):
    rule = await db.get(DiscountRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy tắc chiết khấu")
    await db.delete(rule)
    await db.commit()
