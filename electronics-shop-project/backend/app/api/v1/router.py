from fastapi import APIRouter
from app.api.v1.endpoints import auth, employees, products, inventory, product_media, catalog, cart

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(employees.router)
api_router.include_router(products.router)
api_router.include_router(product_media.router)
api_router.include_router(inventory.router)
api_router.include_router(catalog.router)
api_router.include_router(cart.router)

# TODO (giai đoạn tiếp theo): thêm các router sau khi hoàn thiện endpoint tương ứng
# from app.api.v1.endpoints import customers, employees, cart, orders, installment, promotions, categories, search
# api_router.include_router(customers.router)
# api_router.include_router(employees.router)
# api_router.include_router(cart.router)
# api_router.include_router(orders.router)
# api_router.include_router(installment.router)
# api_router.include_router(promotions.router)
# api_router.include_router(categories.router)
# api_router.include_router(search.router)
