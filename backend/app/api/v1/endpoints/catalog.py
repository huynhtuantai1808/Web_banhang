from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select

from app.db.session import get_db
from app.models.product import Brand, Category
from app.core.security import require_permission
from app.services.file_service import save_product_image

router = APIRouter(tags=["Categories & Brands"])


class BrandInput(BaseModel):
    name: str


class CategoryInput(BaseModel):
    name: str
    parent_id: int | None = None


def _slugify(name: str) -> str:
    return name.strip().lower().replace(" ", "-")


def _category_out(c: Category) -> dict:
    return {
        "id": c.id, "name": c.name, "slug": c.slug, "parent_id": c.parent_id,
        "banner_image_url": c.banner_image_url,
    }


# ================= Brands =================

@router.get("/brands")
async def list_brands(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Brand).order_by(Brand.name))
    return [{"id": b.id, "name": b.name} for b in result.scalars().all()]


@router.post("/brands", status_code=201)
async def create_brand(
    payload: BrandInput, db: AsyncSession = Depends(get_db), _employee_id: str = Depends(require_permission("can_create"))
):
    existing = await db.execute(select(Brand).where(Brand.name == payload.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Hãng '{payload.name}' đã tồn tại")
    brand = Brand(name=payload.name)
    db.add(brand)
    await db.commit()
    await db.refresh(brand)
    return {"id": brand.id, "name": brand.name}


@router.put("/brands/{brand_id}")
async def update_brand(
    brand_id: int, payload: BrandInput, db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_edit")),
):
    brand = await db.get(Brand, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Không tìm thấy hãng")
    brand.name = payload.name
    await db.commit()
    await db.refresh(brand)
    return {"id": brand.id, "name": brand.name}


@router.delete("/brands/{brand_id}", status_code=204)
async def delete_brand(
    brand_id: int, db: AsyncSession = Depends(get_db), _employee_id: str = Depends(require_permission("can_delete"))
):
    brand = await db.get(Brand, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Không tìm thấy hãng")
    try:
        await db.delete(brand)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Không thể xoá — vẫn còn sản phẩm thuộc hãng này")


# ================= Categories =================

@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Trả về DANH SÁCH PHẲNG kèm parent_id — Frontend tự dựng cây cha/con (menu ☰, breadcrumb)
    từ danh sách này, tránh phải gọi nhiều lần cho từng cấp."""
    result = await db.execute(select(Category).order_by(Category.name))
    return [_category_out(c) for c in result.scalars().all()]


@router.get("/categories/{category_id}")
async def get_category(category_id: int, db: AsyncSession = Depends(get_db)):
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    return _category_out(category)


@router.post("/categories", status_code=201)
async def create_category(
    payload: CategoryInput, db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_create")),
):
    existing = await db.execute(select(Category).where(Category.name == payload.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Danh mục '{payload.name}' đã tồn tại")
    if payload.parent_id is not None and not await db.get(Category, payload.parent_id):
        raise HTTPException(status_code=400, detail="Danh mục cha không tồn tại")
    category = Category(name=payload.name, slug=_slugify(payload.name), parent_id=payload.parent_id)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return _category_out(category)


@router.put("/categories/{category_id}")
async def update_category(
    category_id: int, payload: CategoryInput, db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_edit")),
):
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    if payload.parent_id == category_id:
        raise HTTPException(status_code=400, detail="Danh mục không thể là danh mục cha của chính nó")
    if payload.parent_id is not None and not await db.get(Category, payload.parent_id):
        raise HTTPException(status_code=400, detail="Danh mục cha không tồn tại")
    category.name = payload.name
    category.slug = _slugify(payload.name)
    category.parent_id = payload.parent_id
    await db.commit()
    await db.refresh(category)
    return _category_out(category)


@router.post("/categories/{category_id}/banner-image")
async def upload_category_banner(
    category_id: int,
    file: UploadFile = File(..., description="Ảnh banner riêng cho danh mục (JPEG/PNG/WEBP/GIF, tối đa 5MB)"),
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_edit")),
):
    """Tải ảnh banner riêng — hiển thị khi khách click vào trang danh mục này (khác banner trang chủ)."""
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")

    image_url = await save_product_image(f"category-{category_id}", file)
    category.banner_image_url = image_url
    await db.commit()
    await db.refresh(category)
    return _category_out(category)


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(
    category_id: int, db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_delete")),
):
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    try:
        await db.delete(category)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=400, detail="Không thể xoá — vẫn còn sản phẩm hoặc danh mục con thuộc danh mục này"
        )
