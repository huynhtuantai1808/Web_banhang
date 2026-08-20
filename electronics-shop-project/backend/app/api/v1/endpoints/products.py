import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func

from app.db.session import get_db
from app.models.product import Product, Brand, Category, ProductImage
from app.models.review import ProductReview
from app.models.customer import Customer
from app.schemas.product import ProductCreate, ProductOut, ReviewCreate, ReviewOut
from app.core.security import require_permission, require_customer
from app.services.catalog_service import (
    get_or_create_brand, get_or_create_category, get_brand_name, get_category_name,
)

router = APIRouter(prefix="/products", tags=["Products"])


async def _row_to_out(
    db: AsyncSession,
    product: Product,
    brand_name: str | None,
    category_name: str | None,
    primary_image_url: str | None = None,
) -> ProductOut:
    """Ghép entity Product (lưu brand_id/category_id) với tên hãng/danh mục + ảnh đại diện + rating."""
    # Compute average rating
    rating_result = await db.execute(
        select(
            func.coalesce(func.avg(ProductReview.rating), 0).cast(float),
            func.count(ProductReview.id),
        ).where(ProductReview.product_id == product.id)
    )
    avg_rating, review_count = rating_result.one()
    return ProductOut(
        id=product.id,
        product_code=product.product_code,
        name=product.name,
        description=product.description,
        long_description=product.long_description,
        video_url=product.video_url,
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
        average_rating=round(float(avg_rating), 1) if avg_rating else None,
        review_count=int(review_count) if review_count else 0,
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
    category_id: int | None = Query(None, description="Lọc theo ID danh mục (tự động gồm cả danh mục con)"),
    feature: str | None = Query(None, description="Lọc theo chức năng/công dụng (tìm trong tên + mô tả)"),
    on_sale: bool | None = Query(None, description="True = chỉ lấy sản phẩm đang có giá khuyến mãi"),
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
    if category_id is not None:
        # Trang danh mục cha (VD "Laptop") phải hiển thị luôn sản phẩm của danh mục con
        # (VD "Laptop Gaming", "Ultrabook") — lấy toàn bộ id con (1 cấp) rồi lọc IN (...).
        children_result = await db.execute(select(Category.id).where(Category.parent_id == category_id))
        child_ids = [row[0] for row in children_result.all()]
        stmt = stmt.where(Product.category_id.in_([category_id, *child_ids]))
    if feature:
        stmt = stmt.where(
            or_(Product.name.ilike(f"%{feature}%"), Product.description.ilike(f"%{feature}%"))
        )
    if on_sale:
        stmt = stmt.where(Product.discount_price.is_not(None))
    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    rows = result.all()
    return [await _row_to_out(db, p, b, c, img) for p, b, c, img in rows]


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = _base_query().where(Product.id == product_id)
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    p, b, c, img = row
    return await _row_to_out(db, p, b, c, img)


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

    # Ưu tiên brand_id / category_id (chọn từ dropdown). Nếu không có thì dùng tên (nhập tay).
    brand_id = payload.brand_id if payload.brand_id else await get_or_create_brand(db, payload.brand)
    category_id = payload.category_id if payload.category_id else await get_or_create_category(db, payload.category)

    product = Product(
        id=uuid.uuid4(),
        product_code=payload.product_code,
        name=payload.name,
        description=payload.description,
        long_description=payload.long_description,
        video_url=payload.video_url,
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
    return await _row_to_out(db, product, brand_name, category_name, None)


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

    # Ưu tiên brand_id / category_id (chọn từ dropdown). Nếu không có thì dùng tên (nhập tay).
    brand_id = payload.brand_id if payload.brand_id else await get_or_create_brand(db, payload.brand)
    category_id = payload.category_id if payload.category_id else await get_or_create_category(db, payload.category)

    product.product_code = payload.product_code
    product.name = payload.name
    product.description = payload.description
    product.long_description = payload.long_description
    product.video_url = payload.video_url
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

    return await _row_to_out(db, product, brand_name, category_name, primary_image_url)


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


# ---- Đánh giá sản phẩm ----

@router.get("/{product_id}/reviews", response_model=list[ReviewOut])
async def get_reviews(
    product_id: uuid.UUID,
    page: int = 1,
    page_size: int = 10,
    db: AsyncSession = Depends(get_db),
):
    """Danh sách đánh giá của sản phẩm, mới nhất trước."""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    result = await db.execute(
        select(ProductReview, Customer)
        .join(Customer, ProductReview.customer_id == Customer.id)
        .where(ProductReview.product_id == product_id)
        .order_by(ProductReview.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = result.all()
    return [
        ReviewOut(
            id=r.id,
            product_id=str(r.product_id),
            customer_id=str(r.customer_id),
            customer_name=c.full_name,
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r, c in rows
    ]


@router.post("/{product_id}/reviews", response_model=ReviewOut, status_code=201)
async def create_review(
    product_id: uuid.UUID,
    payload: ReviewCreate,
    customer_id: str = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Gửi đánh giá sản phẩm — yêu cầu đăng nhập. Mỗi khách chỉ đánh giá 1 lần cho 1 sản phẩm."""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating phải từ 1 đến 5 sao")

    customer_uuid = uuid.UUID(customer_id)
    existing = await db.execute(
        select(ProductReview).where(
            ProductReview.product_id == product_id,
            ProductReview.customer_id == customer_uuid,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Bạn đã đánh giá sản phẩm này rồi")

    customer = await db.get(Customer, customer_uuid)
    review = ProductReview(
        product_id=product_id,
        customer_id=customer_uuid,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    return ReviewOut(
        id=review.id,
        product_id=str(review.product_id),
        customer_id=str(review.customer_id),
        customer_name=customer.full_name if customer else None,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at.isoformat() if review.created_at else "",
    )


# ---- Sản phẩm liên quan ----

@router.get("/{product_id}/related", response_model=list[ProductOut])
async def get_related_products(
    product_id: uuid.UUID,
    limit: int = 8,
    db: AsyncSession = Depends(get_db),
):
    """Lấy sản phẩm liên quan: cùng danh mục, khác sản phẩm hiện tại, active."""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    stmt = (
        _base_query()
        .where(
            Product.category_id == product.category_id,
            Product.id != product_id,
            Product.status == "active",
        )
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [await _row_to_out(db, p, b, c, img) for p, b, c, img in rows]
