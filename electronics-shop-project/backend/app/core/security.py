from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=True)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(subject: str, expires_delta: timedelta, extra_claims: dict | None = None) -> str:
    to_encode = {"sub": subject, "exp": datetime.utcnow() + expires_delta}
    if extra_claims:
        to_encode.update(extra_claims)
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str, extra_claims: dict | None = None) -> str:
    return create_token(
        subject,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        extra_claims,
    )


def create_refresh_token(subject: str) -> str:
    return create_token(subject, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Dependency dùng cho các route cần đăng nhập (khớp với nút Authorize trên Swagger)."""
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        if user_id is None:
            raise ValueError("Token thiếu 'sub'")
        return user_id
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_employee(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Dependency dành riêng cho các route quản trị (bất kỳ nhân viên nào, không phân biệt admin/staff)."""
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("role") != "employee":
            raise ValueError("Không đủ quyền")
        return payload.get("sub")
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ nhân viên quản lý mới được thực hiện thao tác này",
        )


async def require_customer(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Dependency dành cho các route chỉ khách hàng mới gọi được (giỏ hàng, đơn hàng...)."""
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("role") != "customer":
            raise ValueError("Không đủ quyền")
        return payload.get("sub")
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tài khoản khách hàng mới được thực hiện thao tác này",
        )


async def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Dependency dành riêng cho vai trò 'admin' (Quản lý) — full quyền, VD: quản lý tài khoản nhân viên."""
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("role") != "employee" or payload.get("employee_role") != "admin":
            raise ValueError("Không đủ quyền")
        return payload.get("sub")
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tài khoản Quản lý (admin) mới được thực hiện thao tác này",
        )


def require_permission(permission_key: str):
    """Factory tạo dependency kiểm tra quyền chi tiết cho nhân viên vai trò 'staff' (Nhân viên).

    - Vai trò 'admin' (Quản lý): luôn được phép, bỏ qua kiểm tra permissions.
    - Vai trò 'staff' (Nhân viên): chỉ được phép nếu Quản lý đã bật quyền tương ứng
      (VD: can_create, can_edit, can_delete) khi tạo/sửa tài khoản nhân viên đó.

    Lưu ý: permissions được nhúng vào JWT tại thời điểm đăng nhập — nếu Quản lý vừa đổi quyền
    của một nhân viên đang đăng nhập, nhân viên đó cần đăng nhập lại để quyền mới có hiệu lực.
    """

    async def checker(
        credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    ) -> str:
        try:
            payload = decode_token(credentials.credentials)
            if payload.get("role") != "employee":
                raise ValueError("Không đủ quyền")

            if payload.get("employee_role") == "admin":
                return payload.get("sub")  # admin luôn full quyền

            permissions = payload.get("permissions") or {}
            if not permissions.get(permission_key, False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Bạn không có quyền '{permission_key}'. Liên hệ Quản lý để được cấp quyền.",
                )
            return payload.get("sub")
        except (JWTError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Token không hợp lệ hoặc không đủ quyền",
            )

    return checker
