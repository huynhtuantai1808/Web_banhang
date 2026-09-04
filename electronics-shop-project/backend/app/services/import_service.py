import io
import uuid
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.product import Product
from app.services.catalog_service import get_or_create_brand, get_or_create_category

# Các cột bắt buộc/tuỳ chọn trong file mẫu import (Excel hoặc CSV)
REQUIRED_COLUMNS = ["product_code", "name", "price"]
OPTIONAL_COLUMNS = [
    "description", "brand", "category", "color", "material",
    "size_dimension", "discount_price",
]


def _read_dataframe(filename: str, content: bytes) -> pd.DataFrame:
    buffer = io.BytesIO(content)
    if filename.lower().endswith((".xlsx", ".xls")):
        return pd.read_excel(buffer)
    return pd.read_csv(buffer)


async def import_products_from_file(db: AsyncSession, filename: str, content: bytes) -> dict:
    """Đọc file Excel/CSV khách/nhân viên upload lên, tạo sản phẩm hàng loạt.

    Trả về: {"success": số dòng thành công, "failed": [...chi tiết lỗi theo dòng...]}
    """
    try:
        df = _read_dataframe(filename, content)
    except Exception as e:
        return {"success": 0, "failed": [{"row": 0, "error": f"Không đọc được file: {e}"}]}

    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        return {
            "success": 0,
            "failed": [{"row": 0, "error": f"Thiếu cột bắt buộc: {', '.join(missing_cols)}"}],
        }

    success_count = 0
    failed_rows = []

    for idx, row in df.iterrows():
        row_no = idx + 2  # +2: tính cả header và bắt đầu từ 1
        try:
            if pd.isna(row.get("product_code")) or pd.isna(row.get("name")) or pd.isna(row.get("price")):
                raise ValueError("Thiếu mã sản phẩm / tên / giá")

            brand_id = await get_or_create_brand(db, row.get("brand"))
            category_id = await get_or_create_category(db, row.get("category"))

            product_code = str(row["product_code"]).strip()
            
            existing_product = await db.scalar(select(Product).where(Product.product_code == product_code))
            
            if existing_product:
                existing_product.name = str(row["name"]).strip()
                existing_product.description = None if pd.isna(row.get("description")) else str(row.get("description"))
                existing_product.brand_id = brand_id
                existing_product.category_id = category_id
                existing_product.color = None if pd.isna(row.get("color")) else str(row.get("color"))
                existing_product.material = None if pd.isna(row.get("material")) else str(row.get("material"))
                existing_product.size_dimension = None if pd.isna(row.get("size_dimension")) else str(row.get("size_dimension"))
                existing_product.price = float(row["price"])
                existing_product.discount_price = None if pd.isna(row.get("discount_price")) else float(row.get("discount_price"))
            else:
                product = Product(
                    id=uuid.uuid4(),
                    product_code=product_code,
                    name=str(row["name"]).strip(),
                    description=None if pd.isna(row.get("description")) else str(row.get("description")),
                    brand_id=brand_id,
                    category_id=category_id,
                    color=None if pd.isna(row.get("color")) else str(row.get("color")),
                    material=None if pd.isna(row.get("material")) else str(row.get("material")),
                    size_dimension=None if pd.isna(row.get("size_dimension")) else str(row.get("size_dimension")),
                    price=float(row["price"]),
                    discount_price=None if pd.isna(row.get("discount_price")) else float(row.get("discount_price")),
                    status="active",
                )
                db.add(product)
            await db.flush()
            success_count += 1
        except Exception as e:
            failed_rows.append({"row": row_no, "error": str(e)})

    if success_count > 0:
        await db.commit()
    else:
        await db.rollback()

    return {"success": success_count, "failed": failed_rows}
