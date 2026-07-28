import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.db.session import get_db
from app.models.cart import Cart, CartItem
from app.models.product import Product, ProductImage
from app.core.security import require_customer
from app.schemas.cart import CartItemAdd, CartItemOut, CartOut
from app.services.discount_rule_service import compute_auto_discount

router = APIRouter(prefix="/cart", tags=["Cart (Giỏ hàng)"])


async def _get_or_create_cart(db: AsyncSession, customer_id: uuid.UUID) -> Cart:
    result = await db.execute(select(Cart).where(Cart.customer_id == customer_id))
    cart = result.scalar_one_or_none()
    if not cart:
        cart = Cart(id=uuid.uuid4(), customer_id=customer_id)
        db.add(cart)
        await db.flush()
    return cart


async def _build_cart_out(db: AsyncSession, cart_id: uuid.UUID) -> CartOut:
    stmt = (
        select(CartItem, Product, ProductImage.url)
        .join(Product, CartItem.product_id == Product.id)
        .outerjoin(
            ProductImage,
            and_(ProductImage.product_id == Product.id, ProductImage.is_primary.is_(True)),
        )
        .where(CartItem.cart_id == cart_id)
    )
    result = await db.execute(stmt)

    items: list[CartItemOut] = []
    total = 0.0
    for cart_item, product, image_url in result.all():
        unit_price = float(product.discount_price if product.discount_price else product.price)
        total += unit_price * cart_item.quantity
        items.append(
            CartItemOut(
                id=cart_item.id,
                product_id=product.id,
                product_name=product.name,
                product_price=float(product.price),
                product_discount_price=float(product.discount_price) if product.discount_price else None,
                product_image_url=image_url,
                is_installment_eligible=product.is_installment_eligible,
                quantity=cart_item.quantity,
            )
        )

    return CartOut(items=items, total_amount=total)


@router.get("/auto-discount")
async def get_auto_discount_preview(
    db: AsyncSession = Depends(get_db), customer_id: str = Depends(require_customer)
):
    """Xem trước số tiền được chiết khấu TỰ ĐỘNG (theo hãng/danh mục/số lượng, không cần nhập mã)
    cho giỏ hàng hiện tại — dùng ở trang checkout để hiển thị ngay cả khi khách chưa nhập mã KM."""
    cart_result = await db.execute(select(Cart).where(Cart.customer_id == uuid.UUID(customer_id)))
    cart = cart_result.scalar_one_or_none()
    if not cart:
        return {"auto_discount_amount": 0}

    items_result = await db.execute(
        select(CartItem, Product).join(Product, CartItem.product_id == Product.id).where(CartItem.cart_id == cart.id)
    )
    cart_rows = items_result.all()
    discount = await compute_auto_discount(db, cart_rows)
    return {"auto_discount_amount": discount}


@router.get("", response_model=CartOut)
async def get_cart(db: AsyncSession = Depends(get_db), customer_id: str = Depends(require_customer)):
    """Xem giỏ hàng của khách hàng đang đăng nhập."""
    cart = await _get_or_create_cart(db, uuid.UUID(customer_id))
    await db.commit()
    return await _build_cart_out(db, cart.id)


@router.post("/items", response_model=CartOut, status_code=201)
async def add_to_cart(
    payload: CartItemAdd,
    db: AsyncSession = Depends(get_db),
    customer_id: str = Depends(require_customer),
):
    """Thêm sản phẩm vào giỏ hàng — nếu đã có trong giỏ thì cộng dồn số lượng."""
    product = await db.get(Product, payload.product_id)
    if not product or product.status != "active":
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại hoặc đã ngừng bán")

    cart = await _get_or_create_cart(db, uuid.UUID(customer_id))

    result = await db.execute(
        select(CartItem).where(
            CartItem.cart_id == cart.id, CartItem.product_id == payload.product_id
        )
    )
    existing_item = result.scalar_one_or_none()

    if existing_item:
        existing_item.quantity += payload.quantity
    else:
        db.add(
            CartItem(
                id=uuid.uuid4(),
                cart_id=cart.id,
                product_id=payload.product_id,
                quantity=payload.quantity,
            )
        )

    await db.commit()
    return await _build_cart_out(db, cart.id)


@router.put("/items/{item_id}", response_model=CartOut)
async def update_cart_item(
    item_id: uuid.UUID,
    quantity: int,
    db: AsyncSession = Depends(get_db),
    customer_id: str = Depends(require_customer),
):
    """Cập nhật số lượng một sản phẩm trong giỏ (quantity <= 0 sẽ xoá khỏi giỏ)."""
    cart = await _get_or_create_cart(db, uuid.UUID(customer_id))
    item = await db.get(CartItem, item_id)
    if not item or item.cart_id != cart.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm trong giỏ")

    if quantity <= 0:
        await db.delete(item)
    else:
        item.quantity = quantity

    await db.commit()
    return await _build_cart_out(db, cart.id)


@router.delete("/items/{item_id}", response_model=CartOut)
async def remove_cart_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    customer_id: str = Depends(require_customer),
):
    cart = await _get_or_create_cart(db, uuid.UUID(customer_id))
    item = await db.get(CartItem, item_id)
    if not item or item.cart_id != cart.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm trong giỏ")

    await db.delete(item)
    await db.commit()
    return await _build_cart_out(db, cart.id)
