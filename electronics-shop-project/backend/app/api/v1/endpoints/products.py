import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_

from app.db.session import get_db
from app.models.product import Product, Brand, Category, ProductImage
from app.schemas.product import ProductCreate, ProductOut
from app.core.security import require_permission
from app.services.catalog_service import (
    get_or_create_brand, get_or_create_category, get_brand_name, get_category_name,
)

router = APIRouter(prefix="/products", tags=["Products"])


def _row_to_out(
    product: Product,
    brand_name: str | None,
    category_name: str | None,
    primary_image_url: str | None = None,
) -> ProductOut:
    """Ghép entity Product (lưu brand_id/category_id) với tên hãng/danh mục + ảnh đại diện đã join sẵn."""
    return ProductOut(
        id=product.id,
        product_code=product.product_code,
        name=product.name,
        description=product.description,
        brand=brand_name,
        category=category_name,
        color=product.color,
        material=product.material,
        size_dimension=product.size_dimension,
        specification=product.specification,
        price=float(product.price),
        discount_price=float(product.discount_price) if product.discount_price is not None else None,
        is_installment_eligible=product.is_installment_eligible,
        status=product.status,
        primary_image_url=primary_image_url,
    )


def _base_query():
    """Query dùng chung: join Brand/Category theo tên + ảnh đại diện (is_primary=True)."""
    return (
        select(Product, Brand.name, Category.name, ProductImage.url)
        .outerjoin(Brand, Product.brand_id == Brand.id)
        .outerjoin(Category, Product.category_id == Category.id)
        .outerjoin(
            ProductImage,
            and_(ProductImage.product_id == Product.id, ProductImage.is_primary.is_(True)),
        )
    )


@router.get("", response_model=list[ProductOut])
async def list_products(
    keyword: str | None = Query(None, description="Từ khoá tìm kiếm tên sản phẩm"),
    brand: str | None = Query(None, description="Lọc theo tên hãng"),
    category: str | None = Query(None, description="Lọc theo tên danh mục"),
    feature: str | None = Query(None, description="Lọc theo chức năng/công dụng (tìm trong tên + mô tả)"),
    min_price: float | None = None,
    max_price: float | None = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Danh mục sản phẩm theo hãng - giá - loại - chức năng + thanh tìm kiếm.

    Các bộ lọc kết hợp với nhau theo kiểu AND — VD: keyword="điện thoại" + brand="Samsung"
    + max_price=10000000 + feature="gaming" sẽ trả về sản phẩm thoả TẤT CẢ điều kiện trên.
    """
    stmt = _base_query().where(Product.status == "active")

    if keyword:
        stmt = stmt.where(Product.name.ilike(f"%{keyword}%"))
    if brand:
        stmt = stmt.where(Brand.name.ilike(f"%{brand}%"))
    if category:
        stmt = stmt.where(Category.name.ilike(f"%{category}%"))
    if feature:
        stmt = stmt.where(
            or_(Product.name.ilike(f"%{feature}%"), Product.description.ilike(f"%{feature}%"))
        )
    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    return [_row_to_out(p, b, c, img) for p, b, c, img in result.all()]


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = _base_query().where(Product.id == product_id)
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return _row_to_out(*row)


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_create")),
):
    """Nhập sản phẩm mới. Hãng/danh mục nhập tên tự do, hệ thống tự tạo mới nếu chưa tồn tại
    (giống cách file Excel/CSV import hoạt động). Yêu cầu quyền 'can_create'."""
    existing = await db.execute(select(Product).where(Product.product_code == payload.product_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Mã sản phẩm '{payload.product_code}' đã tồn tại")

    brand_id = await get_or_create_brand(db, payload.brand)
    category_id = await get_or_create_category(db, payload.category)

    product = Product(
        id=uuid.uuid4(),
        product_code=payload.product_code,
        name=payload.name,
        description=payload.description,
        brand_id=brand_id,
        category_id=category_id,
        color=payload.color,
        material=payload.material,
        size_dimension=payload.size_dimension,
        specification=payload.specification,
        price=payload.price,
        discount_price=payload.discount_price,
        is_installment_eligible=payload.is_installment_eligible,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)

    brand_name = await get_brand_name(db, product.brand_id)
    category_name = await get_category_name(db, product.category_id)
    return _row_to_out(product, brand_name, category_name, None)


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: uuid.UUID,
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_edit")),
):
    """Yêu cầu quyền 'can_edit'."""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    brand_id = await get_or_create_brand(db, payload.brand)
    category_id = await get_or_create_category(db, payload.category)

    product.product_code = payload.product_code
    product.name = payload.name
    product.description = payload.description
    product.brand_id = brand_id
    product.category_id = category_id
    product.color = payload.color
    product.material = payload.material
    product.size_dimension = payload.size_dimension
    product.specification = payload.specification
    product.price = payload.price
    product.discount_price = payload.discount_price
    product.is_installment_eligible = payload.is_installment_eligible

    await db.commit()
    await db.refresh(product)

    brand_name = await get_brand_name(db, product.brand_id)
    category_name = await get_category_name(db, product.category_id)

    img_result = await db.execute(
        select(ProductImage.url).where(
            ProductImage.product_id == product.id, ProductImage.is_primary.is_(True)
        )
    )
    primary_image_url = img_result.scalar_one_or_none()

    return _row_to_out(product, brand_name, category_name, primary_image_url)


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_delete")),
):
    """Yêu cầu quyền 'can_delete'."""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    product.status = "discontinued"
    await db.commit()
