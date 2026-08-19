import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.product import Brand, Category


def _is_blank(value) -> bool:
    if value is None:
        return True
    try:
        if pd.isna(value):
            return True
    except (TypeError, ValueError):
        pass
    return str(value).strip() == ""


async def get_or_create_brand(db: AsyncSession, name: str | None) -> int | None:
    """Tìm hãng theo tên, tự tạo mới nếu chưa tồn tại. Trả về brand_id hoặc None nếu name rỗng."""
    if _is_blank(name):
        return None
    name = str(name).strip()

    result = await db.execute(select(Brand).where(Brand.name == name))
    brand = result.scalar_one_or_none()
    if not brand:
        brand = Brand(name=name)
        db.add(brand)
        await db.flush()
    return brand.id


async def get_or_create_category(db: AsyncSession, name: str | None) -> int | None:
    """Tìm danh mục theo tên, tự tạo mới nếu chưa tồn tại. Trả về category_id hoặc None nếu name rỗng."""
    if _is_blank(name):
        return None
    name = str(name).strip()

    result = await db.execute(select(Category).where(Category.name == name))
    category = result.scalar_one_or_none()
    if not category:
        slug = name.lower().replace(" ", "-")
        category = Category(name=name, slug=slug)
        db.add(category)
        await db.flush()
    return category.id


async def get_brand_name(db: AsyncSession, brand_id: int | None) -> str | None:
    if brand_id is None:
        return None
    brand = await db.get(Brand, brand_id)
    return brand.name if brand else None


async def get_category_name(db: AsyncSession, category_id: int | None) -> str | None:
    if category_id is None:
        return None
    category = await db.get(Category, category_id)
    return category.name if category else None
