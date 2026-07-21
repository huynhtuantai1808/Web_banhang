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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
