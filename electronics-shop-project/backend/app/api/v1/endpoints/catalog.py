from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.product import Brand, Category

router = APIRouter(tags=["Categories & Brands"])


@router.get("/brands")
async def list_brands(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Brand).order_by(Brand.name))
    return [{"id": b.id, "name": b.name} for b in result.scalars().all()]


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.name))
    return [{"id": c.id, "name": c.name, "slug": c.slug} for c in result.scalars().all()]
