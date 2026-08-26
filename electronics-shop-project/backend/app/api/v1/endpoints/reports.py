from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract

from app.db.session import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.customer import Customer
from app.core.security import require_admin
from app.services.email_service import send_revenue_report_email

router = APIRouter(prefix="/admin/reports", tags=["Reports (Báo cáo)"])


def _date_range_for_period(period: str, date_str: str | None) -> tuple[datetime, datetime]:
    """Trả về (start, end) UTC cho period."""
    if date_str:
        try:
            ref = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            ref = datetime.now(timezone.utc)
    else:
        ref = datetime.now(timezone.utc)

    if period == "daily":
        start = ref.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
    elif period == "weekly":
        start = ref - timedelta(days=ref.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(weeks=1)
    elif period == "monthly":
        start = ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if ref.month == 12:
            end = start.replace(year=start.year + 1, month=1)
        else:
            end = start.replace(month=start.month + 1)
    else:
        start = ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if ref.month == 12:
            end = start.replace(year=start.year + 1, month=1)
        else:
            end = start.replace(month=start.month + 1)

    return start, end


@router.get("/revenue")
async def get_revenue_report(
    period: str = Query("monthly", description="daily | weekly | monthly"),
    date: str | None = Query(None, description="Ngày tham chiếu YYYY-MM-DD (mặc định: hôm nay)"),
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    """Báo cáo doanh thu theo ngày / tuần / tháng."""
    start, end = _date_range_for_period(period, date)

    # Tổng doanh thu
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Order.final_amount), 0)).where(
            and_(
                Order.payment_status == "paid",
                Order.created_at >= start,
                Order.created_at < end,
            )
        )
    )
    total_revenue = float(revenue_result.scalar() or 0)

    # Số đơn hàng hoàn tất / đã xác nhận
    order_count_result = await db.execute(
        select(func.count(Order.id)).where(
            and_(
                Order.status.in_(["confirmed", "completed", "shipping"]),
                Order.created_at >= start,
                Order.created_at < end,
            )
        )
    )
    order_count = order_count_result.scalar() or 0

    # Top sản phẩm bán chạy
    top_products_result = await db.execute(
        select(Product.name, func.sum(OrderItem.quantity).label("qty"), func.sum(OrderItem.unit_price * OrderItem.quantity).label("rev"))
        .join(Order, OrderItem.order_id == Order.id)
        .join(Product, OrderItem.product_id == Product.id)
        .where(
            and_(
                Order.status.in_(["confirmed", "completed", "shipping"]),
                Order.created_at >= start,
                Order.created_at < end,
            )
        )
        .group_by(Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(10)
    )
    top_products = [
        {"name": name, "quantity_sold": qty, "revenue": float(rev)}
        for name, qty, rev in top_products_result.all()
    ]

    # Top khách hàng
    top_customers_result = await db.execute(
        select(Customer.full_name, func.count(Order.id).label("order_count"), func.sum(Order.final_amount).label("spend"))
        .join(Customer, Order.customer_id == Customer.id)
        .where(
            and_(
                Order.payment_status == "paid",
                Order.created_at >= start,
                Order.created_at < end,
            )
        )
        .group_by(Customer.full_name)
        .order_by(func.sum(Order.final_amount).desc())
        .limit(10)
    )
    top_customers = [
        {"name": name, "order_count": cnt, "total_spend": float(spend or 0)}
        for name, cnt, spend in top_customers_result.all()
    ]

    # Doanh thu theo ngày (cho biểu đồ)
    daily_revenue_result = await db.execute(
        select(
            func.date_trunc("day", Order.created_at).label("day"),
            func.sum(Order.final_amount).label("rev"),
        )
        .where(
            and_(
                Order.payment_status == "paid",
                Order.created_at >= start,
                Order.created_at < end,
            )
        )
        .group_by("day")
        .order_by("day")
    )
    daily_revenue = [
        {"date": str(row.day)[:10], "revenue": float(row.rev)}
        for row in daily_revenue_result.all()
    ]

    return {
        "period": period,
        "from_date": start.strftime("%Y-%m-%d"),
        "to_date": end.strftime("%Y-%m-%d"),
        "total_revenue": total_revenue,
        "order_count": order_count,
        "top_products": top_products,
        "top_customers": top_customers,
        "daily_revenue": daily_revenue,
    }


@router.post("/send-email")
async def send_revenue_email(
    period: str = Query("monthly", description="daily | weekly | monthly"),
    date: str | None = Query(None, description="Ngày tham chiếu YYYY-MM-DD"),
    to_email: str = Query(..., description="Email nhận báo cáo"),
    db: AsyncSession = Depends(get_db),
    _admin_id: str = Depends(require_admin),
):
    """Gửi báo cáo doanh thu qua email."""
    start, end = _date_range_for_period(period, date)

    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Order.final_amount), 0)).where(
            and_(
                Order.payment_status == "paid",
                Order.created_at >= start,
                Order.created_at < end,
            )
        )
    )
    total_revenue = float(revenue_result.scalar() or 0)

    order_count_result = await db.execute(
        select(func.count(Order.id)).where(
            and_(
                Order.status.in_(["confirmed", "completed", "shipping"]),
                Order.created_at >= start,
                Order.created_at < end,
            )
        )
    )
    order_count = order_count_result.scalar() or 0

    top_products_result = await db.execute(
        select(Product.name, func.sum(OrderItem.quantity).label("qty"), func.sum(OrderItem.unit_price * OrderItem.quantity).label("rev"))
        .join(Order, OrderItem.order_id == Order.id)
        .join(Product, OrderItem.product_id == Product.id)
        .where(
            and_(
                Order.status.in_(["confirmed", "completed", "shipping"]),
                Order.created_at >= start,
                Order.created_at < end,
            )
        )
        .group_by(Product.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(10)
    )
    top_products = [
        {"name": name, "quantity_sold": qty, "revenue": float(rev)}
        for name, qty, rev in top_products_result.all()
    ]

    try:
        await send_revenue_report_email(
            to_email=to_email,
            period=period,
            from_date=start.strftime("%Y-%m-%d"),
            to_date=end.strftime("%Y-%m-%d"),
            total_revenue=total_revenue,
            order_count=order_count,
            top_products=top_products,
        )
        return {"message": f"Đã gửi báo cáo doanh thu tới {to_email}"}
    except Exception as e:
        return {"message": f"Gửi email thất bại: {str(e)}"}
