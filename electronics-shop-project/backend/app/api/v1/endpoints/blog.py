import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.blog_post import BlogPost
from app.schemas.blog_post import (
    BlogPostCreate, BlogPostUpdate, BlogPostOut, BlogPostListOut,
)
from app.core.security import require_admin
from app.core.utils import make_slug

router = APIRouter(prefix="/blog", tags=["Blog (Tin tức & Khuyến mãi)"])

CATEGORIES = ["news", "promotion", "guide"]


def _post_out(p: BlogPost) -> BlogPostOut:
    return BlogPostOut.model_validate(p)


def _post_list_out(p: BlogPost) -> BlogPostListOut:
    return BlogPostListOut.model_validate(p)


# ── Public ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[BlogPostListOut])
async def list_posts(
    category: str | None = Query(None, description="news | promotion | guide"),
    published_only: bool = Query(True, description="Chỉ bài đã xuất bản"),
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Danh sách bài viết công khai (phân trang)."""
    query = select(BlogPost)
    if category:
        query = query.where(BlogPost.category == category)
    if published_only:
        query = query.where(BlogPost.is_published == True)  # noqa: E712
    query = query.order_by(BlogPost.display_order, BlogPost.published_at.desc(), BlogPost.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return [_post_list_out(p) for p in result.scalars().all()]


@router.get("/categories", response_model=list[str])
async def list_categories():
    """Danh sách categories có sẵn."""
    return CATEGORIES


@router.get("/{slug}", response_model=BlogPostOut)
async def get_post(slug: str, db: AsyncSession = Depends(get_db)):
    """Chi tiết bài viết công khai."""
    result = await db.execute(select(BlogPost).where(BlogPost.slug == slug))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    if not post.is_published:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    return _post_out(post)


# ── Admin ───────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=list[BlogPostListOut])
async def list_all_posts(
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_admin),
):
    """Danh sách TẤT CẢ bài viết (kể cả chưa xuất bản) — cho admin."""
    query = select(BlogPost)
    if category:
        query = query.where(BlogPost.category == category)
    query = query.order_by(BlogPost.display_order, BlogPost.created_at.desc())
    result = await db.execute(query)
    return [_post_list_out(p) for p in result.scalars().all()]


@router.post("", response_model=BlogPostOut, status_code=201)
async def create_post(
    payload: BlogPostCreate,
    db: AsyncSession = Depends(get_db),
    employee_id: str = Depends(require_admin),
):
    """Tạo bài viết mới."""
    slug = make_slug(payload.title)

    # Đảm bảo slug unique
    existing = await db.execute(select(BlogPost.slug).where(BlogPost.slug == slug))
    while existing.scalar_one_or_none():
        slug = make_slug(payload.title)

    published_at = datetime.utcnow() if payload.is_published else None

    post = BlogPost(
        id=uuid.uuid4(),
        title=payload.title,
        slug=slug,
        summary=payload.summary,
        content=payload.content,
        image_url=payload.image_url,
        category=payload.category,
        is_published=payload.is_published,
        published_at=published_at,
        display_order=payload.display_order,
        created_by=uuid.UUID(employee_id) if employee_id else None,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return _post_out(post)


@router.put("/{post_id}", response_model=BlogPostOut)
async def update_post(
    post_id: uuid.UUID,
    payload: BlogPostUpdate,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_admin),
):
    """Cập nhật bài viết."""
    post = await db.get(BlogPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")

    update_data = payload.model_dump(exclude_unset=True)

    # Nếu cập nhật title → regenerate slug
    if "title" in update_data and update_data["title"] != post.title:
        new_slug = make_slug(update_data["title"])
        update_data["slug"] = new_slug

    # Nếu is_published chuyển từ False → True → set published_at
    if "is_published" in update_data:
        if update_data["is_published"] and not post.is_published:
            update_data["published_at"] = datetime.utcnow()
        elif not update_data["is_published"]:
            update_data["published_at"] = None

    for key, value in update_data.items():
        setattr(post, key, value)

    await db.commit()
    await db.refresh(post)
    return _post_out(post)


@router.delete("/{post_id}", status_code=204)
async def delete_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_admin),
):
    """Xóa bài viết."""
    post = await db.get(BlogPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    await db.delete(post)
    await db.commit()
