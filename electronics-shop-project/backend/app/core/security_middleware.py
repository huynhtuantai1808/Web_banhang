import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
import re

logger = logging.getLogger("security")
logger.setLevel(logging.WARNING)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - SECURITY ALERT - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

# SlowAPI Limiter for Rate Limiting
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# Danh sách các pattern URL nguy hiểm cần block ngay lập tức
BLOCKLIST_PATTERNS = [
    r"\.env.*",
    r"\.git.*",
    r"\.config.*",
    r"wp-admin",
    r"wp-login\.php",
    r".*\.php$",
    r"\.\./",
    r"\.\.%2f"
]

BLOCKLIST_REGEX = re.compile("|".join(BLOCKLIST_PATTERNS), re.IGNORECASE)

class SecurityBlocklistMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        
        if BLOCKLIST_REGEX.search(path):
            ip = request.client.host if request.client else "Unknown IP"
            logger.warning(f"Blocked malicious request from {ip} targeting {path}")
            # Trả về 403 Forbidden thay vì chạy tiếp vào ứng dụng
            return Response(content="Forbidden", status_code=403)
            
        response = await call_next(request)
        return response
