import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException

UPLOAD_ROOT = Path(os.environ.get("UPLOADS_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))).resolve() / "products"
BANNER_ROOT = Path(os.environ.get("UPLOADS_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))).resolve() / "banners"

# Danh sách rộng để chấp nhận tất cả các định dạng ảnh phổ biến (bao gồm HEIC từ iPhone, BMP, SVG, AVIF...)
ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
    "image/bmp", "image/x-ms-bmp", "image/svg+xml", "image/avif",
    "image/heic", "image/heif", "image/tiff", "image/x-icon",
}
ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg", ".avif", ".heic", ".heif", ".tiff", ".ico"}
MAX_FILE_SIZE_MB = 5
MAX_BANNER_SIZE_MB = 100


async def _validate_image(file: UploadFile) -> str:
    """Validate ảnh upload: chấp nhận dựa trên content_type HOẶC extension. Trả về ext."""
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"

    # Trường hợp 1: content_type hợp lệ → OK
    if file.content_type and file.content_type in ALLOWED_IMAGE_TYPES:
        return ext

    # Trường hợp 2: extension hợp lệ (một số client không gửi content_type đúng)
    if ext in ALLOWED_IMAGE_EXTS:
        return ext

    raise HTTPException(
        status_code=400,
        detail=f"Định dạng ảnh không hỗ trợ: {file.content_type or 'unknown'} (.{ext.lstrip('.') or 'no-ext'}). "
        f"Chỉ nhận: {', '.join(sorted(ALLOWED_IMAGE_EXTS))}",
    )


async def save_product_image(product_id: str, file: UploadFile) -> str:
    """Lưu ảnh sản phẩm, trả về đường dẫn URL tương đối."""
    ext = await _validate_image(file)

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"Ảnh vượt quá {MAX_FILE_SIZE_MB}MB")

    product_dir = UPLOAD_ROOT / product_id
    product_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4()}{ext}"
    file_path = product_dir / filename

    with open(file_path, "wb") as f:
        f.write(contents)

    return f"/uploads/products/{product_id}/{filename}"


async def save_banner_image(file: UploadFile) -> str:
    """Lưu ảnh banner quảng cáo (tối đa 100MB)."""
    ext = await _validate_image(file)

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_BANNER_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"Ảnh banner vượt quá {MAX_BANNER_SIZE_MB}MB")

    BANNER_ROOT.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4()}{ext}"
    file_path = BANNER_ROOT / filename

    with open(file_path, "wb") as f:
        f.write(contents)

    return f"/uploads/banners/{filename}"


async def delete_uploaded_file(image_url: str) -> None:
    """Xoá file ảnh đã lưu trên disk theo đường dẫn tương đối."""
    if not image_url or not image_url.startswith("/uploads/"):
        return
    relative_path = image_url.lstrip("/")
    file_path = Path(relative_path)
    if file_path.is_file():
        file_path.unlink()
