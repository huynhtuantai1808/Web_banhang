import time
import asyncio
from collections import defaultdict
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

logger = logging.getLogger("security")
logger.setLevel(logging.WARNING)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - SECURITY ALERT - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

# SlowAPI Limiter for Rate Limiting
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# ---- Config ----
BAN_THRESHOLD = 5        # bao nhiêu lần vi phạm thì ban
BAN_DURATION = 3600      # ban bao lâu (giây) - 1 tiếng
CLEANUP_INTERVAL = 300   # dọn dẹp bộ nhớ mỗi 5 phút

# ---- State (dùng Redis nếu multi-worker) ----
violation_count: dict[str, int] = defaultdict(int)
banned_ips: dict[str, float] = {}  # ip -> thời điểm hết ban

SUSPICIOUS_PATTERNS = [
    # PHP attacks
    "eval-stdin.php", "phpunit", "php://input",
    "allow_url_include", "auto_prepend_file",
    # File probing
    ".env", "wp-config", "actuator/", "_ignition",
    "laravel.log", ".git/", ".htaccess",
    # Shells & backdoors
    "shell.php", "c99.php", "r57.php", "webshell",
    "/etc/passwd", "../../",
]

def is_suspicious(path: str, query: str) -> bool:
    combined = (path + "?" + query).lower()
    return any(p.lower() in combined for p in SUSPICIOUS_PATTERNS)

async def periodic_cleanup():
    """Dọn dẹp IP hết hạn ban định kỳ"""
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL)
        now = time.time()
        expired = [ip for ip, exp in banned_ips.items() if now > exp]
        for ip in expired:
            del banned_ips[ip]
            violation_count.pop(ip, None)
        if expired:
            logger.info(f"Unbanned {len(expired)} IPs after ban duration")

class SecurityBlocklistMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        ip = request.client.host if request.client else "Unknown IP"
        path = request.url.path
        query = request.url.query or ""
        now = time.time()

        # 1. Kiểm tra IP đang bị ban
        if ip in banned_ips:
            if now < banned_ips[ip]:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Forbidden"},
                    headers={"Retry-After": str(int(banned_ips[ip] - now))}
                )
            else:
                # Hết hạn ban — cho qua, reset
                del banned_ips[ip]
                violation_count[ip] = 0

        # 2. Kiểm tra request có suspicious không
        if is_suspicious(path, query):
            violation_count[ip] += 1
            count = violation_count[ip]

            logger.warning(
                f"[{count}/{BAN_THRESHOLD}] - Blocked malicious request from {ip} targeting {path}"
            )

            # 3. Đủ ngưỡng → BAN
            if count >= BAN_THRESHOLD:
                banned_ips[ip] = now + BAN_DURATION
                logger.error(
                    f"🚫 AUTO-BANNED {ip} for {BAN_DURATION//60} minutes after {count} violations"
                )

            return JSONResponse(status_code=403, content={"detail": "Forbidden"})

        return await call_next(request)
