from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.settings import SiteSettings
from app.core.security import require_admin
from app.schemas.settings import SiteSettingsOut, SiteSettingsUpdate
from app.services.file_service import save_product_image  # tái dùng logic lưu file (xem ghi chú bên dưới)

router = APIRouter(prefix="/settings", tags=["Site Settings (Giao diện Storefront)"])


async def _get_or_create_settings(db: AsyncSession) -> SiteSettings:
    settings_row = await db.get(SiteSettings, 1)
    if not settings_row:
        settings_row = SiteSettings(id=1)
        db.add(settings_row)
        await db.commit()
        await db.refresh(settings_row)
    return settings_row


@router.get("", response_model=SiteSettingsOut)
async def get_site_settings(db: AsyncSession = Depends(get_db)):
    """Đọc cấu hình hiển thị hiện tại — API công khai, Frontend storefront gọi lúc tải trang chủ."""
    return await _get_or_create_settings(db)


@router.put("", response_model=SiteSettingsOut)
async def update_site_settings(
    payload: SiteSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    """Cập nhật tên shop / tiêu đề banner / mô tả / màu chủ đạo — chỉ Quản lý (admin).
    Đây là API đứng sau tính năng 'tuỳ chỉnh giao diện hiển thị người dùng' ở trang quản trị."""
    settings_row = await _get_or_create_settings(db)

    update_data = payload.model_dump(exclude_unset=True)
    from sqlalchemy.orm.attributes import flag_modified
    
    for field, value in update_data.items():
        setattr(settings_row, field, value)
        if field == "quick_links":
            flag_modified(settings_row, "quick_links")

    await db.commit()
    await db.refresh(settings_row)
    return settings_row


@router.post("/banner-image", response_model=SiteSettingsOut)
async def upload_banner_image(
    file: UploadFile = File(..., description="Ảnh banner hero (JPEG/PNG/WEBP/GIF, tối đa 5MB)"),
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    """Tải ảnh banner cho khu vực hero của trang chủ — chỉ Quản lý (admin)."""
    settings_row = await _get_or_create_settings(db)
    image_url = await save_product_image("site-banner", file)
    settings_row.banner_image_url = image_url
    await db.commit()
    await db.refresh(settings_row)
    return settings_row

@router.post("/upload-image")
async def upload_general_image(
    file: UploadFile = File(..., description="Ảnh chung (JPEG/PNG/WEBP/GIF, tối đa 5MB)"),
    _admin_id: str = Depends(require_admin),
):
    """Upload ảnh chung (ví dụ cho Quick Links) và trả về URL — chỉ Quản lý (admin)."""

@router.post("/logo-image", response_model=SiteSettingsOut)
async def upload_logo_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    settings_row = await _get_or_create_settings(db)
    file_url = await save_product_image("site-logo", file)
    settings_row.logo_image_url = file_url
    await db.commit()
    await db.refresh(settings_row)
    return settings_row


@router.post("/upload-image")
async def upload_general_image(
    file: UploadFile = File(...),
    _admin_id: str = Depends(require_admin),
):
    """API dùng chung để upload ảnh tuỳ ý (như icon/hình cho quick link)"""
    file_url = await save_product_image("quick-links", file)
    return {"url": file_url}
