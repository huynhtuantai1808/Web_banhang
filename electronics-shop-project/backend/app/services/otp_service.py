import asyncio
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


async def send_otp_via_sms_or_email(phone: str, otp_code: str, email: str | None = None) -> None:
    """Gửi mã OTP tới khách hàng.

    - Nếu khách có email VÀ Backend đã cấu hình SMTP thật (`EMAIL_SMTP_HOST` trong `.env`):
      gửi email THẬT chứa mã OTP (dùng smtplib qua `asyncio.to_thread` để không chặn event loop).
    - Ngược lại (chưa cấu hình SMTP, hoặc không có email — trường hợp gửi qua SMS): in ra console.
      Gửi SMS thật cần tích hợp thêm nhà cung cấp trả phí (Twilio, ESMS, Speedsms...) — chưa có
      sẵn merchant account miễn phí nào để tích hợp mặc định, nên tạm giữ ở dạng log để bạn tự
      cắm API của nhà cung cấp mình chọn vào nhánh `else` bên dưới.
    """
    if email and settings.EMAIL_SMTP_HOST:
        try:
            await asyncio.to_thread(_send_otp_email_sync, email, otp_code)
            return
        except Exception as e:  # noqa: BLE001 — không để lỗi gửi mail chặn luồng đăng nhập
            print(f"[OTP] Gửi email thất bại ({e}), fallback log console. Mã OTP: {otp_code} (email: {email})")
            return

    print(f"[DEV] Gửi OTP {otp_code} tới {phone}" + (f" / {email}" if email else ""))


def _send_otp_email_sync(to_email: str, otp_code: str) -> None:
    """Gửi email OTP đồng bộ qua SMTP — chạy trong thread riêng (xem asyncio.to_thread ở trên)."""
    import smtplib
    from email.mime.text import MIMEText

    message = MIMEText(
        f"Mã xác thực (OTP) đăng nhập của bạn là: {otp_code}\n"
        f"Mã có hiệu lực trong {settings.OTP_TTL_SECONDS // 60} phút. "
        f"Không chia sẻ mã này với bất kỳ ai.",
        "plain",
        "utf-8",
    )
    message["Subject"] = "Mã xác thực đăng nhập"
    message["From"] = settings.EMAIL_SMTP_USER or "no-reply@example.com"
    message["To"] = to_email

    with smtplib.SMTP(settings.EMAIL_SMTP_HOST, settings.EMAIL_SMTP_PORT, timeout=10) as server:
        server.starttls()
        if settings.EMAIL_SMTP_USER and settings.EMAIL_SMTP_PASSWORD:
            server.login(settings.EMAIL_SMTP_USER, settings.EMAIL_SMTP_PASSWORD)
        server.sendmail(message["From"], [to_email], message.as_string())
