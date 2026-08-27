import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from passlib.context import CryptContext

from app.db.session import get_db
from app.models.customer import Customer
from app.models.order import Order
from app.core.security import require_admin
from app.schemas.customer import CustomerOut, CustomerDetailOut, CustomerUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/customers", tags=["Customers (Khách hàng — Admin)"])


@router.get("", response_model=list[CustomerOut])
async def list_customers(
    keyword: str | None = Query(None, description="Tìm theo tên hoặc số điện thoại"),
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    """Danh sách khách hàng — chỉ Quản lý (admin) mới xem được."""
    stmt = select(Customer).order_by(Customer.created_at.desc())
    if keyword:
        stmt = stmt.where(
            (Customer.full_name.ilike(f"%{keyword}%")) | (Customer.phone.ilike(f"%{keyword}%"))
        )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{customer_id}", response_model=CustomerDetailOut)
async def get_customer(
    customer_id: uuid.UUID, db: AsyncSession = Depends(get_db), _admin_id: str = Depends(require_admin)
):
    """Chi tiết 1 khách hàng kèm tổng số đơn hàng + tổng chi tiêu — chỉ admin."""
    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng")

    stats_result = await db.execute(
        select(func.count(Order.id), func.coalesce(func.sum(Order.final_amount), 0)).where(
            Order.customer_id == customer_id, Order.payment_status == "paid"
        )
    )
    total_orders, total_spent = stats_result.one()

    return CustomerDetailOut(
        id=customer.id,
        customer_code=customer.customer_code,
        full_name=customer.full_name,
        phone=customer.phone,
        email=customer.email,
        address=customer.address,
        is_verified=customer.is_verified,
        is_active=customer.is_active,
        created_at=customer.created_at,
        total_orders=total_orders or 0,
        total_spent=float(total_spent or 0),
    )


@router.put("/{customer_id}", response_model=CustomerOut)
async def update_customer(
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    """Sửa thông tin / khoá-mở khoá / đổi mật khẩu tài khoản khách hàng — chỉ admin."""
    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng")

    data = payload.model_dump(exclude_unset=True)

    # Đổi mật khẩu riêng
    if data.get("new_password"):
        customer.password_hash = pwd_context.hash(data.pop("new_password"))

    for field, value in data.items():
        setattr(customer, field, value)

    await db.commit()
    await db.refresh(customer)
    return customer
