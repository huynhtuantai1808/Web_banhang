import os
import uuid
import asyncio
from pathlib import Path
from fastapi import UploadFile, HTTPException

UPLOAD_ROOT = Path("uploads/products")
BANNER_ROOT = Path("uploads/banners")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE_MB = 5
MAX_BANNER_SIZE_MB = 100


async def save_product_image(product_id: str, file: UploadFile) -> str:
    """Lưu ảnh sản phẩm, trả về đường dẫn URL tương đối (/uploads/...)."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng ảnh không hỗ trợ: {file.content_type}. Chỉ nhận JPEG/PNG/WEBP/GIF.",
        )

    contents = await _read_file_in_chunks(file)
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"Ảnh vượt quá {MAX_FILE_SIZE_MB}MB")

    product_dir = UPLOAD_ROOT / product_id
    product_dir.mkdir(parents=True, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = product_dir / filename

    await asyncio.to_thread(_write_file, file_path, contents)
    return f"/uploads/products/{product_id}/{filename}"


async def save_banner_image(file: UploadFile) -> str:
    """Lưu ảnh banner quảng cáo (tối đa 100MB)."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng ảnh không hỗ trợ: {file.content_type}. Chỉ nhận JPEG/PNG/WEBP/GIF.",
        )

    contents = await _read_file_in_chunks(file)
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_BANNER_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"Ảnh banner vượt quá {MAX_BANNER_SIZE_MB}MB")

    BANNER_ROOT.mkdir(parents=True, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = BANNER_ROOT / filename

    await asyncio.to_thread(_write_file, file_path, contents)
    return f"/uploads/banners/{filename}"


async def _read_file_in_chunks(file: UploadFile) -> bytes:
    """Đọc file upload thành bytes (dùng thread để không block)."""
    return await asyncio.to_thread(file.read)


def _write_file(path: Path, data: bytes) -> None:
    with open(path, "wb") as f:
        f.write(data)


async def delete_uploaded_file(image_url: str) -> None:
    """Xoá file ảnh đã lưu trên disk theo đường dẫn tương đối."""
    if not image_url or not image_url.startswith("/uploads/"):
        return
    relative_path = image_url.lstrip("/")
    file_path = Path(relative_path)
    await asyncio.to_thread(_delete_file, file_path)


def _delete_file(path: Path) -> None:
    if path.is_file():
        path.unlink()
