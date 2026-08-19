from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str
    phone: str = Field(..., min_length=8, max_length=15)
    email: EmailStr | None = None
    password: str = Field(..., min_length=6)
    address: str | None = None


class LoginRequest(BaseModel):
    phone: str
    password: str


class LoginStepOneResponse(BaseModel):
    message: str = "OTP đã được gửi. Vui lòng xác thực để hoàn tất đăng nhập."
    otp_token: str  # token tạm để định danh phiên chờ OTP (lưu ở Redis)


class VerifyOtpRequest(BaseModel):
    otp_token: str
    otp_code: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
