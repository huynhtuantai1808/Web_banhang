"""
Script tạo 1 tài khoản admin (nhân viên) và 1 tài khoản khách hàng mẫu để test đăng nhập.

Cách chạy (từ thư mục backend/, sau khi đã tạo .env và chạy database/schema.sql):
    python -m scripts.seed_users

Có thể chạy lại nhiều lần an toàn — script sẽ bỏ qua nếu tài khoản đã tồn tại
(theo email/số điện thoại) thay vì tạo trùng hoặc báo lỗi.
"""
import asyncio
import uuid

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.core.security import hash_password
from app.models.employee import Employee, Role
from app.models.customer import Customer

# ============ THÔNG TIN TÀI KHOẢN MẪU — đổi mật khẩu ngay sau khi đăng nhập lần đầu ============
ADMIN_ACCOUNT = {
    "employee_code": "NV000001",
    "full_name": "Quản trị viên hệ thống",
    "phone": "0900000001",
    "email": "admin@techtrace.vn",
    "password": "Admin@123456",
    "role_name": "admin",
}

CUSTOMER_ACCOUNT = {
    "customer_code": "KH000001",
    "full_name": "Khách hàng Demo",
    "phone": "0900000002",
    "email": "customer@techtrace.vn",
    "password": "Customer@123456",
    "address": "123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh",
}


async def _get_or_create_role(db, name: str) -> Role:
    result = await db.execute(select(Role).where(Role.name == name))
    role = result.scalar_one_or_none()
    if role:
        return role
    role = Role(name=name)
    db.add(role)
    await db.flush()
    return role


async def seed_admin(db) -> str:
    result = await db.execute(select(Employee).where(Employee.email == ADMIN_ACCOUNT["email"]))
    existing = result.scalar_one_or_none()
    if existing:
        return f"Tài khoản admin đã tồn tại ({ADMIN_ACCOUNT['email']}) — bỏ qua."

    role = await _get_or_create_role(db, ADMIN_ACCOUNT["role_name"])

    employee = Employee(
        id=uuid.uuid4(),
        employee_code=ADMIN_ACCOUNT["employee_code"],
        full_name=ADMIN_ACCOUNT["full_name"],
        phone=ADMIN_ACCOUNT["phone"],
        email=ADMIN_ACCOUNT["email"],
        password_hash=hash_password(ADMIN_ACCOUNT["password"]),
        role_id=role.id,
        permissions={},  # admin (Quản lý) luôn full quyền, không phụ thuộc permissions
        is_active=True,
    )
    db.add(employee)
    return f"Đã tạo tài khoản admin: {ADMIN_ACCOUNT['email']}"


async def seed_customer(db) -> str:
    result = await db.execute(select(Customer).where(Customer.phone == CUSTOMER_ACCOUNT["phone"]))
    existing = result.scalar_one_or_none()
    if existing:
        return f"Tài khoản khách hàng đã tồn tại ({CUSTOMER_ACCOUNT['phone']}) — bỏ qua."

    customer = Customer(
        id=uuid.uuid4(),
        customer_code=CUSTOMER_ACCOUNT["customer_code"],
        full_name=CUSTOMER_ACCOUNT["full_name"],
        phone=CUSTOMER_ACCOUNT["phone"],
        email=CUSTOMER_ACCOUNT["email"],
        password_hash=hash_password(CUSTOMER_ACCOUNT["password"]),
        address=CUSTOMER_ACCOUNT["address"],
        is_verified=True,  # bỏ qua bước xác thực OTP ban đầu cho tài khoản demo
        is_active=True,
    )
    db.add(customer)
    return f"Đã tạo tài khoản khách hàng: {CUSTOMER_ACCOUNT['phone']}"


async def main():
    async with AsyncSessionLocal() as db:
        admin_msg = await seed_admin(db)
        customer_msg = await seed_customer(db)
        await db.commit()

    print(admin_msg)
    print(customer_msg)
    print()
    print("=" * 60)
    print("THÔNG TIN ĐĂNG NHẬP")
    print("=" * 60)
    print(f"[ADMIN]    Đăng nhập tại POST /api/v1/employees/login")
    print(f"           email    : {ADMIN_ACCOUNT['email']}")
    print(f"           password : {ADMIN_ACCOUNT['password']}")
    print()
    print(f"[KHÁCH HÀNG] Đăng nhập tại POST /api/v1/auth/login (2 bước, cần OTP)")
    print(f"           phone    : {CUSTOMER_ACCOUNT['phone']}")
    print(f"           password : {CUSTOMER_ACCOUNT['password']}")
    print(f"           (Ở môi trường dev, mã OTP được in ra console log của uvicorn)")
    print("=" * 60)
    print("⚠️  Đây là tài khoản demo — đổi mật khẩu ngay khi triển khai thật.")


if __name__ == "__main__":
    asyncio.run(main())
