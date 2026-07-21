import uuid
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.product import InventoryTransaction, Product

router = APIRouter(prefix="/inventory", tags=["Inventory (Quản lý kho)"])


class InventoryTransactionCreate(BaseModel):
    product_id: uuid.UUID
    employee_id: uuid.UUID
    type: str  # "import" hoặc "export"
    quantity: int
    note: str | None = None


@router.post("", status_code=201)
async def create_inventory_transaction(payload: InventoryTransactionCreate, db: AsyncSession = Depends(get_db)):
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
