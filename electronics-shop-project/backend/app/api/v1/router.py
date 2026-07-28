from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, employees, products, inventory, product_media, catalog, cart, orders, payments, settings,
    promotions, installment, customers, shipments, admin_orders, discount_rules,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(employees.router)
api_router.include_router(products.router)
api_router.include_router(product_media.router)
api_router.include_router(inventory.router)
api_router.include_router(catalog.router)
api_router.include_router(cart.router)
api_router.include_router(orders.router)
api_router.include_router(payments.router)
api_router.include_router(settings.router)
api_router.include_router(promotions.router)
api_router.include_router(installment.router)
api_router.include_router(customers.router)
api_router.include_router(shipments.router)
api_router.include_router(admin_orders.router)
api_router.include_router(discount_rules.router)

# Ghi chú: "categories" và "search" trong TODO cũ (bản nháp đầu tiên) đã được phủ đầy đủ mà
# không cần router riêng:
#   - Quản lý danh mục/hãng (CRUD)  → đã có trong catalog.router (brands + categories ở trên)
#   - Tìm kiếm sản phẩm             → đã có trong products.router (GET /products hỗ trợ
#     keyword/brand/category/feature/min_price/max_price, kết hợp AND với nhau)
