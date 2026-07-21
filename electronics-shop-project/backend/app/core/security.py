from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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
