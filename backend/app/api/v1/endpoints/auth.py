import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.customer import Customer
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.services.otp_service import generate_otp, verify_otp, send_otp_via_sms_or_email
from app.schemas.auth import (
    RegisterRequest, LoginRequest, LoginStepOneResponse, VerifyOtpRequest, TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


async def _generate_customer_code(db: AsyncSession) -> str:
    result = await db.execute(select(Customer.id))
    count = len(result.all())
    return f"KH{count + 1:06d}"


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Customer).where(Customer.phone == payload.phone))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Số điện thoại đã được đăng ký")

    customer = Customer(
        id=uuid.uuid4(),
        customer_code=await _generate_customer_code(db),
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        password_hash=hash_password(payload.password),
        address=payload.address,
    )
    db.add(customer)
    await db.commit()
    return {"message": "Đăng ký thành công", "customer_code": customer.customer_code}


@router.post("/login", response_model=LoginStepOneResponse)
async def login_step1(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Bước 1: xác thực mật khẩu, sau đó gửi OTP."""
    result = await db.execute(select(Customer).where(Customer.phone == payload.phone))
    customer = result.scalar_one_or_none()

    if not customer or not verify_password(payload.password, customer.password_hash):
        raise HTTPException(status_code=401, detail="Số điện thoại hoặc mật khẩu không đúng")

    if not customer.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khoá")

    otp_token, otp_code = await generate_otp(str(customer.id))
    await send_otp_via_sms_or_email(customer.phone, otp_code, email=customer.email)

    return LoginStepOneResponse(otp_token=otp_token)


@router.post("/login/verify-otp", response_model=TokenResponse)
async def login_step2(payload: VerifyOtpRequest):
    """Bước 2: xác thực OTP, cấp JWT nếu đúng."""
    user_id = await verify_otp(payload.otp_token, payload.otp_code)
    if user_id is None:
        raise HTTPException(status_code=400, detail="Mã OTP không đúng hoặc đã hết hạn")

    access_token = create_access_token(subject=user_id, extra_claims={"role": "customer"})
    refresh_token = create_refresh_token(subject=user_id)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
