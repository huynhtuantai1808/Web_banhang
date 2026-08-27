import uuid
from typing import Annotated
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.product import InventoryTransaction, Product, ProductUnit, ProductImage, Brand, Category
from app.core.security import require_employee

router = APIRouter(prefix="/inventory", tags=["Inventory (Quản lý kho)"])


class InventoryTransactionCreate(BaseModel):
    product_id: uuid.UUID
    employee_id: uuid.UUID
    type: str  # "import" hoặc "export"
    quantity: int
    note: str | None = None


class InventoryItem(BaseModel):
    id: str
    product_code: str
    name: str
    category: str | None
    brand: str | None
    price: float
    discount_price: float | None
    in_stock: int
    sold: int
    total_units: int


@router.get("", response_model=list[InventoryItem])
async def list_inventory(
    category_id: Annotated[int | None, Query(description="Lọc theo danh mục")] = None,
    brand_id: Annotated[int | None, Query(description="Lọc theo hãng")] = None,
    keyword: Annotated[str | None, Query(description="Tìm theo mã SP hoặc tên")] = None,
    stock_status: Annotated[str | None, Query(description="in_stock | out_of_stock | low_stock")] = None,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_employee),
):
    """
    Danh sách toàn bộ tồn kho — tên sản phẩm, danh mục, hãng, giá, tổng tồn kho, đã bán.
    """
    # Subquery: đếm số lượng unit trong kho
    units_subq = (
        select(
            ProductUnit.product_id,
            func.count(ProductUnit.id).filter(ProductUnit.status == "in_stock").label("in_stock"),
            func.count(ProductUnit.id).label("total_units")
        )
        .group_by(ProductUnit.product_id)
        .subquery()
    )

    # Subquery: đếm số lượng đã bán
    from app.models.order import OrderItem
    sold_subq = (
        select(
            OrderItem.product_id,
            func.coalesce(func.sum(OrderItem.quantity), 0).label("sold")
        )
        .group_by(OrderItem.product_id)
        .subquery()
    )

    # Main query
    query = (
        select(
            Product.id,
            Product.product_code,
            Product.name,
            Product.price,
            Product.discount_price,
            Category.name.label("category"),
            Brand.name.label("brand"),
            func.coalesce(units_subq.c.in_stock, 0).label("in_stock"),
            func.coalesce(sold_subq.c.sold, 0).label("sold"),
            func.coalesce(units_subq.c.total_units, 0).label("total_units"),
        )
        .outerjoin(Category, Product.category_id == Category.id)
        .outerjoin(Brand, Product.brand_id == Brand.id)
        .outerjoin(units_subq, Product.id == units_subq.c.product_id)
        .outerjoin(sold_subq, Product.id == sold_subq.c.product_id)
        .where(Product.status == "active")
        .order_by(Product.name)
    )

    if category_id is not None:
        query = query.where(Product.category_id == category_id)

    if brand_id is not None:
        query = query.where(Product.brand_id == brand_id)

    if keyword:
        kw = f"%{keyword}%"
        query = query.where(
            (Product.name.ilike(kw)) | (Product.product_code.ilike(kw))
        )

    result = await db.execute(query)
    rows = result.all()

    items = []
    for row in rows:
        in_stock = int(row.in_stock)
        sold = int(row.sold)

        # Apply stock_status filter
        if stock_status == "in_stock" and in_stock <= 0:
            continue
        elif stock_status == "out_of_stock" and in_stock > 0:
            continue
        elif stock_status == "low_stock" and (in_stock <= 0 or sold == 0):
            continue

        items.append(InventoryItem(
            id=str(row.id),
            product_code=row.product_code,
            name=row.name,
            category=row.category,
            brand=row.brand,
            price=float(row.price),
            discount_price=float(row.discount_price) if row.discount_price else None,
            in_stock=in_stock,
            sold=sold,
            total_units=int(row.total_units),
        ))

    return items


@router.post("", status_code=201)
async def create_inventory_transaction(
    payload: InventoryTransactionCreate,
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_employee),
):
    if payload.type not in ("import", "export"):
        raise HTTPException(status_code=400, detail="type phải là 'import' hoặc 'export'")

    product = await db.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    transaction = InventoryTransaction(id=uuid.uuid4(), **payload.model_dump())
    db.add(transaction)
    await db.commit()
    return {"message": f"Đã ghi nhận {payload.type} kho thành công"}


@router.get("/history/{product_id}")
async def get_inventory_history(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InventoryTransaction).where(InventoryTransaction.product_id == product_id)
    )
    return result.scalars().all()
