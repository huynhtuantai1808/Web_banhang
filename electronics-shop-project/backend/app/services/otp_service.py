import random
import uuid
from app.core.redis_client import redis_client
from app.core.config import settings


def _otp_key(otp_token: str) -> str:
    return f"otp:{otp_token}"


def _attempt_key(otp_token: str) -> str:
    return f"otp_attempt:{otp_token}"


async def generate_otp(user_id: str) -> tuple[str, str]:
    """Sinh OTP, lưu vào Redis với TTL, trả về (otp_token, otp_code).

    otp_token: định danh phiên chờ xác thực (gửi cho client, KHÔNG chứa OTP thật)
    otp_code: mã OTP thật, gửi qua SMS/Email, KHÔNG trả về client
    """
    otp_token = str(uuid.uuid4())
    otp_code = str(random.randint(10 ** (settings.OTP_LENGTH - 1), 10 ** settings.OTP_LENGTH - 1))

    await redis_client.set(_otp_key(otp_token), f"{user_id}:{otp_code}", ex=settings.OTP_TTL_SECONDS)
    await redis_client.set(_attempt_key(otp_token), 0, ex=settings.OTP_TTL_SECONDS)

    return otp_token, otp_code


async def verify_otp(otp_token: str, otp_code_input: str) -> str | None:
    """Trả về user_id nếu OTP đúng, None nếu sai/hết hạn/vượt số lần thử."""
    stored = await redis_client.get(_otp_key(otp_token))
    if stored is None:
        return None  # hết hạn hoặc không tồn tại

    attempts = int(await redis_client.get(_attempt_key(otp_token)) or 0)
    if attempts >= settings.OTP_MAX_ATTEMPTS:
        await redis_client.delete(_otp_key(otp_token))
        return None

    user_id, real_otp = stored.split(":", 1)

    if real_otp != otp_code_input:
        await redis_client.incr(_attempt_key(otp_token))
        return None

    # Xác thực thành công -> xoá OTP để tránh dùng lại
    await redis_client.delete(_otp_key(otp_token))
    await redis_client.delete(_attempt_key(otp_token))
    return user_id


async def send_otp_via_sms_or_email(target: str, otp_code: str) -> None:
    """Điểm tích hợp với nhà cung cấp SMS/Email thực tế (Twilio, SES, ESMS...).

    Ở giai đoạn dev, chỉ log ra console. Khi có API key thật trong .env,
    thay phần này bằng lệnh gọi API tương ứng.
    """
    print(f"[DEV] Gửi OTP {otp_code} tới {target}")
