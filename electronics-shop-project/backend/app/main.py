from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.utils import get_openapi
import os

from app.core.config import settings
from app.core.openapi_tags import TAGS_METADATA
from app.api.v1.router import api_router

app = FastAPI(
    title="Electronics Shop API",
    description=(
        "API cho website bán đồ điện tử (điện thoại, laptop, máy tính bảng, PC gaming...).\n\n"
        "Xác thực: gọi `/api/v1/auth/login` rồi `/api/v1/auth/login/verify-otp` để lấy "
        "`access_token`, sau đó bấm nút **Authorize** phía trên và nhập `Bearer <access_token>`."
    ),
    version="0.1.0",
    contact={"name": "Electronics Shop Team"},
    license_info={"name": "Proprietary"},
    openapi_tags=TAGS_METADATA,
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files sau khi app đã được tạo
_UPLOADS_DIR = os.environ.get("UPLOADS_DIR", os.path.join(os.path.dirname(__file__), "..", "uploads"))
_UPLOADS_DIR = os.path.abspath(_UPLOADS_DIR)
os.makedirs(_UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_UPLOADS_DIR, html=False), name="uploads")

app.include_router(api_router)


def custom_openapi():
    """Thêm scheme Bearer JWT vào Swagger để hiển thị nút Authorize."""
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        tags=TAGS_METADATA,
    )
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    for path, methods in schema["paths"].items():
        is_public_auth = path.startswith("/api/v1/auth") or path == "/api/v1/employees/login"
        is_public_catalog = path in ("/api/v1/brands", "/api/v1/categories", "/health", "/api/v1/installment-calculator")
        is_public_payment_callback = path in (
            "/api/v1/payments/vnpay/return",
            "/api/v1/payments/vnpay/ipn",
        )
        is_public_webhook = path == "/api/v1/webhooks/carrier"
        is_public_guest_order = path in ("/api/v1/orders/guest", "/api/v1/orders/lookup")
        if is_public_auth or is_public_catalog or is_public_payment_callback or is_public_webhook or is_public_guest_order:
            continue
        for method, operation in methods.items():
            if path.startswith("/api/v1/products") and method.lower() == "get":
                continue
            if path.startswith("/api/v1/categories") and method.lower() == "get":
                continue
            if path == "/api/v1/settings" and method.lower() == "get":
                continue
            operation.setdefault("security", [{"BearerAuth": []}])

    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "env": settings.APP_ENV}
