from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.utils import get_openapi

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
    redoc_url="/redoc",     # ReDoc (tài liệu dạng đọc)
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phục vụ file ảnh sản phẩm đã upload tại http://.../uploads/products/<file>
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
    # Áp dụng yêu cầu xác thực mặc định cho toàn bộ API trừ auth/health/docs
    for path, methods in schema["paths"].items():
        is_public_auth = path.startswith("/api/v1/auth") or path == "/api/v1/employees/login"
        is_public_catalog = path in ("/api/v1/brands", "/api/v1/categories", "/health")
        if is_public_auth or is_public_catalog:
            continue
        for method, operation in methods.items():
            # Cho phép đọc sản phẩm công khai (khách chưa đăng nhập vẫn xem được),
            # chỉ yêu cầu Bearer cho các thao tác ghi (POST/PUT/DELETE) hoặc route nhân viên.
            if path.startswith("/api/v1/products") and method.lower() == "get":
                continue
            operation.setdefault("security", [{"BearerAuth": []}])

    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "env": settings.APP_ENV}
