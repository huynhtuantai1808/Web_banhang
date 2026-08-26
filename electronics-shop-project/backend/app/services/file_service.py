import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException

UPLOAD_ROOT = Path("uploads/products")
BANNER_ROOT = Path("uploads/banners")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE_MB = 5
MAX_BANNER_SIZE_MB = 10  # Banner thường lớn hơn


async def save_product_image(product_id: str, file: UploadFile) -> str:
    """Lưu ảnh sản phẩm client gửi lên, trả về đường dẫn URL tương đối (/uploads/...)."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng ảnh không hỗ trợ: {file.content_type}. Chỉ nhận JPEG/PNG/WEBP/GIF.",
        )

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"Ảnh vượt quá {MAX_FILE_SIZE_MB}MB")

    product_dir = UPLOAD_ROOT / product_id
    product_dir.mkdir(parents=True, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = product_dir / filename

    with open(file_path, "wb") as f:
        f.write(contents)

    return f"/uploads/products/{product_id}/{filename}"


async def save_banner_image(file: UploadFile) -> str:
    """Lưu ảnh banner quảng cáo. Banner chấp nhận ảnh lớn hơn (tối đa 10MB)."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng ảnh không hỗ trợ: {file.content_type}. Chỉ nhận JPEG/PNG/WEBP/GIF.",
        )

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_BANNER_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"Ảnh banner vượt quá {MAX_BANNER_SIZE_MB}MB")

    BANNER_ROOT.mkdir(parents=True, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = BANNER_ROOT / filename

    with open(file_path, "wb") as f:
        f.write(contents)

    return f"/uploads/banners/{filename}"
