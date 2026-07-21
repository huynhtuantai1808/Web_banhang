import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductOut

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=list[ProductOut])
async def list_products(
    keyword: str | None = Query(None, description="Từ khoá tìm kiếm tên sản phẩm"),
    brand_id: int | None = None,
    category_id: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Danh mục sản phẩm theo hãng - giá - loại + thanh tìm kiếm."""
    stmt = select(Product).where(Product.status == "active")

    if keyword:
        stmt = stmt.where(Product.name.ilike(f"%{keyword}%"))
    if brand_id:
        stmt = stmt.where(Product.brand_id == brand_id)
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return product


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(payload: ProductCreate, db: AsyncSession = Depends(get_db)):
    """Dành cho nhân viên quản lý — tạo sản phẩm mới (nhập kho ban đầu)."""
    product = Product(id=uuid.uuid4(), **payload.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(product_id: uuid.UUID, payload: ProductCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    for field, value in payload.model_dump().items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    product.status = "discontinued"
    await db.commit()
