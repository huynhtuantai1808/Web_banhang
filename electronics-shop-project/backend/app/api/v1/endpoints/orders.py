import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.promotion import Promotion
from app.models.installment import InstallmentPlan
from app.models.customer import Customer
from app.core.security import require_customer, hash_password
from app.schemas.order import OrderCreate, OrderOut, OrderItemOut, OrderCreateResponse, GuestOrderCreate
from app.services import vnpay_service
from app.services.promotion_service import validate_and_compute_discount, mark_promotion_used, PromotionError
from app.services.installment_service import create_installment_plan, CREDIT_CARD_MONTHS, FINANCE_TENURES
from app.services.discount_rule_service import compute_auto_discount

router = APIRouter(prefix="/orders", tags=["Orders (Đơn hàng)"])

VALID_GATEWAYS = ("cod", "vnpay")
VALID_PAYMENT_METHODS = ("full", "installment")


class _QuantityHolder:
    """Bọc số lượng cho luồng khách vãng lai — để tái dùng chung logic tính giá/chiết khấu vốn
    được viết cho (CartItem, Product) mà không cần khách vãng lai có giỏ hàng thật trong DB."""
    def __init__(self, quantity: int):
        self.quantity = quantity


async def _next_order_code(db: AsyncSession) -> str:
    result = await db.execute(select(Order.id))
    count = len(result.all())
    return f"DH{count + 1:08d}"


async def _next_customer_code(db: AsyncSession) -> str:
    result = await db.execute(select(Customer.id))
    count = len(result.all())
    return f"KH{count + 1:06d}"


async def _build_order_out(db: AsyncSession, order: Order) -> OrderOut:
    stmt = (
        select(OrderItem, Product.name)
        .join(Product, OrderItem.product_id == Product.id)
        .where(OrderItem.order_id == order.id)
    )
    result = await db.execute(stmt)
    items = [
        OrderItemOut(
            product_id=item.product_id,
            product_name=name,
            unit_price=float(item.unit_price),
            quantity=item.quantity,
        )
        for item, name in result.all()
    ]

    promotion_code = None
    if order.promotion_id:
        promo = await db.get(Promotion, order.promotion_id)
        promotion_code = promo.code if promo else None

    installment_result = await db.execute(
        select(InstallmentPlan.id).where(InstallmentPlan.order_id == order.id)
    )
    has_installment_plan = installment_result.scalar_one_or_none() is not None

    return OrderOut(
        id=order.id,
        order_code=order.order_code,
        total_amount=float(order.total_amount),
        discount_amount=float(order.discount_amount),
        final_amount=float(order.final_amount),
        payment_method=order.payment_method,
        payment_gateway=order.payment_gateway,
        payment_status=order.payment_status,
        status=order.status,
        shipping_address=order.shipping_address,
        created_at=order.created_at,
        items=items,
        promotion_code=promotion_code,
        has_installment_plan=has_installment_plan,
    )


async def _create_order_core(
    db: AsyncSession,
    request: Request,
    customer_uuid: uuid.UUID,
    cart_rows: list,
    payload: OrderCreate,
) -> tuple[Order, str | None]:
    """Logic tạo đơn hàng DÙNG CHUNG cho cả khách đã đăng nhập (giỏ hàng lấy từ DB) và khách vãng
    lai (giỏ hàng lấy trực tiếp từ request, xem `create_guest_order` bên dưới) — đảm bảo 2 luồng
    tính giá/chiết khấu/trả góp giống hệt nhau, tránh lệch logic giữa 2 nơi."""
    if payload.payment_gateway not in VALID_GATEWAYS:
        raise HTTPException(status_code=400, detail=f"payment_gateway phải là một trong {VALID_GATEWAYS}")
    if payload.payment_method not in VALID_PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail=f"payment_method phải là một trong {VALID_PAYMENT_METHODS}")
    if payload.payment_method == "installment":
        inst_type = payload.installment_type or "credit_card"
        allowed = CREDIT_CARD_MONTHS if inst_type == "credit_card" else FINANCE_TENURES
        if payload.installment_months not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Kỳ hạn {payload.installment_months} tháng không hợp lệ cho loại '{inst_type}'. "
                f"Cho phép: {allowed}",
            )
    if payload.payment_gateway == "vnpay" and not vnpay_service.is_configured():
        raise HTTPException(
            status_code=400,
            detail="Cổng thanh toán VNPay chưa được cấu hình ở Backend (thiếu VNP_TMN_CODE/VNP_HASH_SECRET "
            "trong .env). Vui lòng chọn 'cod' hoặc liên hệ quản trị viên.",
        )
    if not cart_rows:
        raise HTTPException(status_code=400, detail="Giỏ hàng đang trống")

    if payload.payment_method == "installment":
        ineligible = [p.name for _, p in cart_rows if not p.is_installment_eligible]
        if ineligible:
            raise HTTPException(
                status_code=400, detail=f"Sản phẩm sau không hỗ trợ trả góp: {', '.join(ineligible)}"
            )

    total_amount = sum(
        float(product.discount_price if product.discount_price else product.price) * item.quantity
        for item, product in cart_rows
    )

    auto_discount = await compute_auto_discount(db, cart_rows)

    promo_discount = 0.0
    promotion = None
    promo_customer_row = None
    if payload.promo_code:
        try:
            promotion, promo_discount, promo_customer_row = await validate_and_compute_discount(
                db, payload.promo_code, customer_uuid, total_amount - auto_discount
            )
        except PromotionError as e:
            raise HTTPException(status_code=400, detail=str(e))

    discount_amount = auto_discount + promo_discount
    final_amount = total_amount - discount_amount

    order = Order(
        id=uuid.uuid4(),
        order_code=await _next_order_code(db),
        customer_id=customer_uuid,
        promotion_id=promotion.id if promotion else None,
        total_amount=total_amount,
        discount_amount=discount_amount,
        final_amount=final_amount,
        payment_method=payload.payment_method,
        payment_gateway="cod" if payload.payment_method == "installment" else payload.payment_gateway,
        payment_status="pending",
        status="confirmed" if (payload.payment_method == "installment" or payload.payment_gateway == "cod") else "pending",
        shipping_address=payload.shipping_address,
    )
    db.add(order)
    await db.flush()

    for item, product in cart_rows:
        db.add(
            OrderItem(
                id=uuid.uuid4(),
                order_id=order.id,
                product_id=product.id,
                unit_price=float(product.discount_price if product.discount_price else product.price),
                quantity=item.quantity,
            )
        )

    if payload.payment_method == "installment":
        inst_type = payload.installment_type or "credit_card"
        await create_installment_plan(
            db, order.id, final_amount, payload.installment_months, inst_type,
        )

    if promotion:
        await mark_promotion_used(db, promotion, promo_customer_row)

    await db.commit()
    await db.refresh(order)

    payment_url = None
    if order.payment_gateway == "vnpay":
        client_ip = request.client.host if request.client else "127.0.0.1"
        payment_url = vnpay_service.build_payment_url(
            order_code=order.order_code,
            amount_vnd=final_amount,
            order_desc=f"Thanh toan don hang {order.order_code}",
            client_ip=client_ip,
        )

    return order, payment_url


@router.post("", response_model=OrderCreateResponse, status_code=201)
async def create_order(
    payload: OrderCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    customer_id: str = Depends(require_customer),
):
    """Tạo đơn hàng từ giỏ hàng hiện tại của khách ĐÃ ĐĂNG NHẬP, sau đó xoá giỏ hàng.

    - `payment_method = "full"`: trả toàn bộ ngay — chọn thêm `payment_gateway` (`cod`/`vnpay`).
    - `payment_method = "installment"`: trả góp — bắt buộc `installment_months` (3/6/9/12), toàn bộ
      sản phẩm trong giỏ phải cho phép trả góp. Trả góp luôn thanh toán kỳ đầu qua COD.
    - `promo_code`: mã khuyến mãi tuỳ chọn — được kiểm tra lại (không tin dữ liệu từ FE).
    - Khách KHÔNG muốn đăng ký tài khoản? Dùng `POST /orders/guest` thay thế (xem bên dưới).
    """
    customer_uuid = uuid.UUID(customer_id)

    cart_result = await db.execute(select(Cart).where(Cart.customer_id == customer_uuid))
    cart = cart_result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=400, detail="Giỏ hàng đang trống")

    items_result = await db.execute(
        select(CartItem, Product).join(Product, CartItem.product_id == Product.id).where(CartItem.cart_id == cart.id)
    )
    cart_rows = items_result.all()

    order, payment_url = await _create_order_core(db, request, customer_uuid, cart_rows, payload)

    # Xoá giỏ hàng sau khi đã chuyển thành đơn hàng
    for cart_item, _ in cart_rows:
        await db.delete(cart_item)
    await db.commit()

    order_out = await _build_order_out(db, order)
    return OrderCreateResponse(order=order_out, payment_url=payment_url)


@router.post("/guest", response_model=OrderCreateResponse, status_code=201)
async def create_guest_order(payload: GuestOrderCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Đặt hàng KHÔNG CẦN ĐĂNG KÝ TÀI KHOẢN trước — khách chỉ cần điền thông tin (họ tên, SĐT,
    địa chỉ) ngay lúc đặt hàng. Hệ thống tự tạo (hoặc tái sử dụng nếu SĐT đã từng đặt hàng) một hồ
    sơ khách hàng ở chế độ "chưa xác thực" (`is_verified=False`) để LƯU LẠI thông tin đơn hàng —
    khách vẫn tra cứu lại đơn được sau này qua `GET /orders/lookup` (chỉ cần mã đơn + SĐT, không
    cần mật khẩu).

    Giới hạn so với khách đã đăng nhập: KHÔNG hỗ trợ trả góp (`payment_method` luôn là `full`) vì
    trả góp cần theo dõi định danh khách hàng qua nhiều kỳ thanh toán, không phù hợp với đơn vãng
    lai không có tài khoản xác thực.
    """
    if not payload.items:
        raise HTTPException(status_code=400, detail="Giỏ hàng đang trống")

    result = await db.execute(select(Customer).where(Customer.phone == payload.phone))
    customer = result.scalar_one_or_none()
    if not customer:
        customer = Customer(
            id=uuid.uuid4(),
            customer_code=await _next_customer_code(db),
            full_name=payload.full_name,
            phone=payload.phone,
            email=payload.email,
            # Khách vãng lai không đặt mật khẩu — sinh 1 mật khẩu ngẫu nhiên không dùng được để
            # đăng nhập; nếu sau này họ muốn có tài khoản thật, dùng chức năng "Quên mật khẩu"
            # (sẽ bổ sung) hoặc liên hệ hotline để được hỗ trợ chuyển đổi.
            password_hash=hash_password(str(uuid.uuid4())),
            is_verified=False,
            is_active=True,
        )
        db.add(customer)
        await db.flush()

    cart_rows = []
    for item in payload.items:
        product = await db.get(Product, item.product_id)
        if not product or product.status != "active":
            raise HTTPException(status_code=400, detail=f"Sản phẩm không tồn tại hoặc đã ngừng bán")
        cart_rows.append((_QuantityHolder(item.quantity), product))

    order_payload = OrderCreate(
        shipping_address=payload.shipping_address,
        payment_gateway=payload.payment_gateway,
        payment_method="full",  # khách vãng lai không hỗ trợ trả góp
        promo_code=payload.promo_code,
    )
    order, payment_url = await _create_order_core(db, request, customer.id, cart_rows, order_payload)

    order_out = await _build_order_out(db, order)
    return OrderCreateResponse(order=order_out, payment_url=payment_url)


@router.get("/lookup", response_model=OrderOut)
async def lookup_order(order_code: str, phone: str, db: AsyncSession = Depends(get_db)):
    """Tra cứu đơn hàng KHÔNG CẦN ĐĂNG NHẬP — dành cho khách đặt hàng vãng lai (guest checkout).
    Chỉ cần đúng CẢ mã đơn hàng VÀ số điện thoại đã dùng lúc đặt hàng mới xem được (tránh lộ thông
    tin đơn hàng của người khác chỉ bằng cách đoán mã đơn)."""
    stmt = select(Order).join(Customer, Order.customer_id == Customer.id).where(
        Order.order_code == order_code, Customer.phone == phone
    )
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng khớp với mã đơn và số điện thoại đã nhập")
    return await _build_order_out(db, order)


@router.get("", response_model=list[OrderOut])
async def list_my_orders(
    db: AsyncSession = Depends(get_db),
    customer_id: str = Depends(require_customer),
):
    """Tra cứu danh sách đơn hàng của khách hàng đang đăng nhập."""
    result = await db.execute(
        select(Order).where(Order.customer_id == uuid.UUID(customer_id)).order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    return [await _build_order_out(db, o) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    customer_id: str = Depends(require_customer),
):
    """Tra cứu chi tiết 1 đơn hàng — chỉ chủ đơn hàng mới xem được."""
    order = await db.get(Order, order_id)
    if not order or str(order.customer_id) != customer_id:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return await _build_order_out(db, order)
