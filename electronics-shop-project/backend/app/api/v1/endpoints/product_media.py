import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.product import Product, ProductImage
from app.core.security import require_permission
from app.services.file_service import save_product_image
from app.services.import_service import import_products_from_file

router = APIRouter(prefix="/products", tags=["Product Import/Media"])

ALLOWED_IMPORT_EXTENSIONS = (".csv", ".xlsx", ".xls")


@router.post("/{product_id}/images", status_code=201)
async def upload_product_image(
    product_id: uuid.UUID,
    file: UploadFile = File(..., description="Ảnh sản phẩm (JPEG/PNG/WEBP/GIF, tối đa 5MB)"),
    is_primary: bool = False,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_edit")),
):
    """Tải ảnh sản phẩm lên từ client (dùng multipart/form-data trong Swagger: chọn file trực tiếp)."""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    image_url = await save_product_image(str(product_id), file)

    if is_primary:
        # Bỏ cờ primary của các ảnh cũ trước khi gán ảnh mới làm ảnh đại diện
        result = await db.execute(select(ProductImage).where(ProductImage.product_id == product_id))
        for img in result.scalars().all():
            img.is_primary = False

    image = ProductImage(id=uuid.uuid4(), product_id=product_id, url=image_url, is_primary=is_primary)
    db.add(image)
    await db.commit()

    return {"message": "Tải ảnh thành công", "image_url": image_url}


@router.get("/{product_id}/images")
async def list_product_images(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProductImage).where(ProductImage.product_id == product_id))
    return result.scalars().all()


@router.delete("/images/{image_id}", status_code=204)
async def delete_product_image(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_edit")),
):
    image = await db.get(ProductImage, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")
    await db.delete(image)
    await db.commit()


@router.put("/images/{image_id}/primary", status_code=200)
async def set_primary_image(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_edit")),
):
    """Đặt một ảnh làm ảnh đại diện (is_primary=True) của sản phẩm."""
    image = await db.get(ProductImage, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")

    # Bỏ primary của tất cả ảnh cùng sản phẩm
    result = await db.execute(
        select(ProductImage).where(ProductImage.product_id == image.product_id)
    )
    for img in result.scalars().all():
        img.is_primary = img.id == image_id

    await db.commit()
    return {"message": "Đã đặt làm ảnh đại diện", "image_id": str(image_id)}


@router.post("/import")
async def bulk_import_products(
    file: UploadFile = File(
        ...,
        description="File Excel (.xlsx) hoặc CSV chứa danh sách sản phẩm. "
        "Cột bắt buộc: product_code, name, price. "
        "Cột tuỳ chọn: description, brand, category, color, material, size_dimension, discount_price.",
    ),
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_permission("can_create")),
):
    """Nhập dữ liệu sản phẩm hàng loạt — dành cho nhân viên quản lý nhập kho ban đầu.

    Cách dùng trong Swagger: bấm 'Try it out' → chọn file Excel/CSV từ máy → Execute.
    """
    if not file.filename.lower().endswith(ALLOWED_IMPORT_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file .csv, .xlsx hoặc .xls")

    content = await file.read()
    result = await import_products_from_file(db, file.filename, content)

    return {
        "message": f"Nhập thành công {result['success']} sản phẩm",
        "success_count": result["success"],
        "failed_rows": result["failed"],
    }
