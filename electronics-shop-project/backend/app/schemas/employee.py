import uuid
from pydantic import BaseModel, EmailStr


class PermissionSet(BaseModel):
    """Quyền chi tiết cho nhân viên vai trò 'staff' (Nhân viên). Bỏ qua nếu là 'admin' (Quản lý)."""
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False


class EmployeeCreate(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    password: str
    employee_role: str = "staff"  # "admin" (Quản lý) hoặc "staff" (Nhân viên)
    permissions: PermissionSet = PermissionSet()


class EmployeeUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    password: str | None = None  # để trống nếu không đổi mật khẩu
    employee_role: str | None = None
    permissions: PermissionSet | None = None
    is_active: bool | None = None


class EmployeeOut(BaseModel):
    id: uuid.UUID
    employee_code: str
    full_name: str
    phone: str
    email: str
    employee_role: str
    permissions: PermissionSet
    is_active: bool

    class Config:
        from_attributes = True
