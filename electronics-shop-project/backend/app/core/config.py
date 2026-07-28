from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # PostgreSQL
    DATABASE_URL: str

    # Redis
    REDIS_URL: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OTP
    OTP_LENGTH: int = 6
    OTP_TTL_SECONDS: int = 300
    OTP_MAX_ATTEMPTS: int = 5

    # SMS / Email (tuỳ chọn)
    SMS_API_KEY: str | None = None
    SMS_API_URL: str | None = None
    EMAIL_SMTP_HOST: str | None = None
    EMAIL_SMTP_PORT: int = 587
    EMAIL_SMTP_USER: str | None = None
    EMAIL_SMTP_PASSWORD: str | None = None

    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"

    # URL gốc của Frontend — dùng để redirect người dùng về sau khi thanh toán xong ở cổng VNPay
    FRONTEND_URL: str = "http://localhost:3000"

    # ==== Cổng thanh toán VNPay (sandbox) ====
    # Đăng ký tài khoản merchant sandbox miễn phí tại https://sandbox.vnpayment.vn để lấy
    # vnp_TmnCode + vnp_HashSecret thật. Để trống thì hệ thống chỉ cho phép thanh toán COD.
    VNP_TMN_CODE: str | None = None
    VNP_HASH_SECRET: str | None = None
    VNP_PAY_URL: str = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    # URL Backend nhận kết quả trả về từ VNPay sau khi khách thanh toán xong
    VNP_RETURN_URL: str = "http://localhost:8000/api/v1/payments/vnpay/return"

    # ==== Vận chuyển ====
    # Secret dùng để xác thực webhook từ đơn vị vận chuyển (hoặc dịch vụ trung gian Zapier/Make)
    # gọi vào POST /webhooks/carrier — request phải kèm header X-Webhook-Secret khớp giá trị này.
    CARRIER_WEBHOOK_SECRET: str = "change_this_secret"
    # Để trống nếu chưa có tài khoản API thật — hệ thống vẫn hoạt động đầy đủ ở chế độ thủ công.
    GHN_TOKEN: str | None = None
    GHN_SHOP_ID: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
