import uuid
from datetime import datetime
from typing import Annotated
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi.responses import JSONResponse

from app.db.session import get_db
from app.models.banner import Banner
from app.core.security import require_admin
from app.services.file_service import save_banner_image, delete_uploaded_file

router = APIRouter(prefix="/banners", tags=["Banners (Quảng cáo)"])


# ── Schemas ───────────────────────────────────────────────────────────

class BannerCreate(BaseModel):
    title: str
    image_url: str
    subtitle: str | None = None
    description: str | None = None
    link_url: str | None = None
    cta_label: str | None = None
    position: str = "hero"
    display_order: int = 0


class BannerUpdate(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    description: str | None = None
    image_url: str | None = None
    link_url: str | None = None
    cta_label: str | None = None
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    position: str | None = None
    display_order: int | None = None
    is_active: bool | None = None


class BannerOut(BaseModel):
    id: str
    title: str
    subtitle: str | None
    description: str | None
    image_url: str
    link_url: str | None
    cta_label: str | None
    valid_from: datetime | None
    valid_to: datetime | None
    position: str
    display_order: int
    is_active: bool


# ── Helpers ───────────────────────────────────────────────────────────

def _banner_out(b: Banner) -> BannerOut:
    return BannerOut(
        id=str(b.id),
        title=b.title,
        subtitle=b.subtitle,
        description=b.description,
        image_url=b.image_url,
        link_url=b.link_url,
        cta_label=b.cta_label,
        valid_from=b.valid_from,
        valid_to=b.valid_to,
        position=b.position,
        display_order=b.display_order,
        is_active=b.is_active,
    )


# ── Routes — static paths FIRST, then dynamic ────────────────────────

@router.get("", response_model=list[BannerOut])
async def list_banners(
    position: Annotated[str | None, Query(description="hero | promo | sidebar")] = None,
    active_only: Annotated[bool, Query()] = False,
    db: AsyncSession = Depends(get_db),
):
    """Liệt kê banner. Client dùng active_only=true."""
    query = select(Banner)
    if position:
        query = query.where(Banner.position == position)
    if active_only:
        query = query.where(Banner.is_active == True)  # noqa: E712
    query = query.order_by(Banner.display_order, Banner.created_at)
    result = await db.execute(query)
    return [_banner_out(b) for b in result.scalars().all()]


@router.post("/upload-image")
async def upload_banner_image(
    file: UploadFile = File(..., description="Ảnh banner (JPEG/PNG/WEBP/GIF, tối đa 100MB)"),
    _admin_id: str = Depends(require_admin),
):
    """Upload ảnh banner — trả về URL ảnh đã lưu."""
    image_url = await save_banner_image(file)
    return JSONResponse(content={"image_url": image_url})


@router.post("", response_model=BannerOut, status_code=201)
async def create_banner(
    payload: BannerCreate,
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    """Tạo banner mới (image_url đã được upload trước qua /upload-image)."""
    banner = Banner(
        id=uuid.uuid4(),
        title=payload.title,
        subtitle=payload.subtitle,
        description=payload.description,
        image_url=payload.image_url,
        link_url=payload.link_url,
        cta_label=payload.cta_label,
        position=payload.position,
        display_order=payload.display_order,
        is_active=True,
    )
    db.add(banner)
    await db.commit()
    await db.refresh(banner)
    return _banner_out(banner)


@router.put("/{banner_id}", response_model=BannerOut)
async def update_banner(
    banner_id: uuid.UUID,
    payload: BannerUpdate,
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    banner = await db.get(Banner, banner_id)
    if not banner:
        raise HTTPException(status_code=404, detail="Không tìm thấy banner")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(banner, key, value)

    await db.commit()
    await db.refresh(banner)
    return _banner_out(banner)


@router.delete("/{banner_id}", status_code=204)
async def delete_banner(
    banner_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    banner = await db.get(Banner, banner_id)
    if not banner:
        raise HTTPException(status_code=404, detail="Không tìm thấy banner")
    await db.delete(banner)
    await db.commit()


@router.delete("/images/{image_url:path}", status_code=200)
async def delete_banner_image(
    image_url: str,
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    """Xoá file ảnh banner đã upload (theo đường dẫn tương đối trong DB)."""
    await delete_uploaded_file(image_url)
    return {"message": "Đã xoá ảnh"}
