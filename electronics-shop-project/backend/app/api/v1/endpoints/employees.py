import uuid
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.employee import Employee, Role
from app.core.security import (
    hash_password, verify_password, create_access_token, create_refresh_token, require_admin,
)
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut, PermissionSet

router = APIRouter(prefix="/employees", tags=["Employees (Nhân viên)"])

VALID_ROLES = ("admin", "staff")


class EmployeeLoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


async def _get_or_create_role(db: AsyncSession, name: str) -> Role:
    result = await db.execute(select(Role).where(Role.name == name))
    role = result.scalar_one_or_none()
    if role:
        return role
    role = Role(name=name)
    db.add(role)
    await db.flush()
    return role


async def _next_employee_code(db: AsyncSession) -> str:
    result = await db.execute(select(Employee.id))
    count = len(result.all())
    return f"NV{count + 1:06d}"


def _to_out(employee: Employee, role_name: str) -> EmployeeOut:
    return EmployeeOut(
        id=employee.id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        phone=employee.phone,
        email=employee.email,
        employee_role=role_name,
        permissions=PermissionSet(**(employee.permissions or {})),
        is_active=employee.is_active,
    )


@router.post("/login", response_model=TokenResponse)
async def employee_login(payload: EmployeeLoginRequest, db: AsyncSession = Depends(get_db)):
    """Đăng nhập cho nhân viên quản lý (nội bộ) — không yêu cầu OTP.

    Tài khoản nhân viên được tạo bởi Quản lý (admin) qua `POST /employees`, không tự đăng ký công khai.
    """
    result = await db.execute(select(Employee).where(Employee.email == payload.email))
    employee = result.scalar_one_or_none()

    if not employee or not verify_password(payload.password, employee.password_hash):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    if not employee.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản nhân viên đã bị khoá")

    role_result = await db.execute(select(Role).where(Role.id == employee.role_id))
    role = role_result.scalar_one_or_none()
    role_name = role.name if role else "staff"

    # Nhúng employee_role + permissions vào JWT để các dependency require_admin/require_permission
    # kiểm tra được ngay mà không cần truy vấn DB lại ở mỗi request.
    extra_claims = {
        "role": "employee",
        "employee_role": role_name,
        "permissions": employee.permissions or {},
    }
    access_token = create_access_token(subject=str(employee.id), extra_claims=extra_claims)
    refresh_token = create_refresh_token(subject=str(employee.id))

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("", response_model=list[EmployeeOut])
async def list_employees(db: AsyncSession = Depends(get_db), _admin_id: str = Depends(require_admin)):
    """Danh sách nhân viên — chỉ Quản lý (admin) mới xem được."""
    stmt = select(Employee, Role.name).outerjoin(Role, Employee.role_id == Role.id)
    result = await db.execute(stmt)
    return [_to_out(emp, role_name or "staff") for emp, role_name in result.all()]


@router.post("", response_model=EmployeeOut, status_code=201)
async def create_employee(
    payload: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    """Tạo tài khoản nhân viên mới (Add User) — chỉ Quản lý (admin) mới tạo được."""
    if payload.employee_role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"employee_role phải là một trong {VALID_ROLES}")

    existing = await db.execute(select(Employee).where(Employee.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    role = await _get_or_create_role(db, payload.employee_role)

    employee = Employee(
        id=uuid.uuid4(),
        employee_code=await _next_employee_code(db),
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role_id=role.id,
        permissions=payload.permissions.model_dump(),
        is_active=True,
    )
    db.add(employee)
    await db.commit()
    await db.refresh(employee)

    return _to_out(employee, role.name)


@router.put("/{employee_id}", response_model=EmployeeOut)
async def update_employee(
    employee_id: uuid.UUID,
    payload: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    """Sửa thông tin / phân quyền nhân viên — chỉ Quản lý (admin)."""
    employee = await db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")

    if payload.full_name is not None:
        employee.full_name = payload.full_name
    if payload.phone is not None:
        employee.phone = payload.phone
    if payload.email is not None:
        employee.email = payload.email
    if payload.password:
        employee.password_hash = hash_password(payload.password)
    if payload.permissions is not None:
        employee.permissions = payload.permissions.model_dump()
    if payload.is_active is not None:
        employee.is_active = payload.is_active

    role_name = "staff"
    if payload.employee_role is not None:
        if payload.employee_role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"employee_role phải là một trong {VALID_ROLES}")
        role = await _get_or_create_role(db, payload.employee_role)
        employee.role_id = role.id
        role_name = role.name
    else:
        role_result = await db.execute(select(Role).where(Role.id == employee.role_id))
        existing_role = role_result.scalar_one_or_none()
        role_name = existing_role.name if existing_role else "staff"

    await db.commit()
    await db.refresh(employee)
    return _to_out(employee, role_name)


@router.delete("/{employee_id}", status_code=204)
async def deactivate_employee(
    employee_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    """Vô hiệu hoá tài khoản nhân viên (soft-delete, không xoá cứng để giữ lịch sử nhập/xuất kho)."""
    employee = await db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
    employee.is_active = False
    await db.commit()
