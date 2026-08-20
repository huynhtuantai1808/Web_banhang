import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.wishlist import Wishlist
from app.models.product import Product
from app.core.security import require_customer


router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


class WishlistItemOut(BaseModel):
    id: int
    product_id: str
    product_name: str
    product_price: float
    product_discount_price: float | None
    product_image_url: str | None
    added_at: str

    class Config:
        from_attributes = True


class WishlistCountOut(BaseModel):
    count: int


@router.get("", response_model=list[WishlistItemOut])
async def get_wishlist(
    customer_id: str = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách wishlist của khách hàng hiện tại."""
    customer_uuid = uuid.UUID(customer_id)
    result = await db.execute(
        select(Wishlist, Product)
        .join(Product, Wishlist.product_id == Product.id)
        .where(Wishlist.customer_id == customer_uuid)
        .order_by(Wishlist.added_at.desc())
    )
    rows = result.all()

    items: list[WishlistItemOut] = []
    for w, p in rows:
        discount = float(p.discount_price) if p.discount_price is not None else None
        items.append(WishlistItemOut(
            id=w.id,
            product_id=str(w.product_id),
            product_name=p.name,
            product_price=float(p.price),
            product_discount_price=discount,
            product_image_url=p.primary_image_url or None,
            added_at=w.added_at.isoformat() if w.added_at else "",
        ))
    return items


@router.get("/count", response_model=WishlistCountOut)
async def get_wishlist_count(
    customer_id: str = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Lấy số lượng wishlist."""
    customer_uuid = uuid.UUID(customer_id)
    result = await db.execute(
        select(func.count(Wishlist.id)).where(Wishlist.customer_id == customer_uuid)
    )
    count = result.scalar() or 0
    return WishlistCountOut(count=count)


@router.post("/{product_id}", status_code=201)
async def add_to_wishlist(
    product_id: uuid.UUID,
    customer_id: str = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Thêm sản phẩm vào wishlist. Nếu đã tồn tại thì bỏ qua (idempotent)."""
    customer_uuid = uuid.UUID(customer_id)
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    existing = await db.execute(
        select(Wishlist).where(
            Wishlist.customer_id == customer_uuid,
            Wishlist.product_id == product_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Sản phẩm đã có trong wishlist"}

    item = Wishlist(customer_id=customer_uuid, product_id=product_id)
    db.add(item)
    await db.commit()
    return {"message": "Đã thêm vào yêu thích"}


@router.delete("/{product_id}", status_code=204)
async def remove_from_wishlist(
    product_id: uuid.UUID,
    customer_id: str = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Xoá sản phẩm khỏi wishlist."""
    customer_uuid = uuid.UUID(customer_id)
    result = await db.execute(
        select(Wishlist).where(
            Wishlist.customer_id == customer_uuid,
            Wishlist.product_id == product_id,
        )
    )
    item = result.scalar_one_or_none()
    if item:
        await db.delete(item)
        await db.commit()
