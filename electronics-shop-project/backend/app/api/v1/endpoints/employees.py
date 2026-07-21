from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.employee import Employee
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token

router = APIRouter(prefix="/employees", tags=["Employees (Nhân viên)"])


class EmployeeLoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def employee_login(payload: EmployeeLoginRequest, db: AsyncSession = Depends(get_db)):
    """Đăng nhập cho nhân viên quản lý (nội bộ) — không yêu cầu OTP.

    Tài khoản nhân viên được tạo bởi admin qua DB/seed script, không tự đăng ký công khai.
    """
    result = await db.execute(select(Employee).where(Employee.email == payload.email))
    employee = result.scalar_one_or_none()

    if not employee or not verify_password(payload.password, employee.password_hash):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    if not employee.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản nhân viên đã bị khoá")

    access_token = create_access_token(subject=str(employee.id), extra_claims={"role": "employee"})
    refresh_token = create_refresh_token(subject=str(employee.id))

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
