import asyncio
from app.core.config import settings


def _format_vnd(v: float) -> str:
    return f"{v:,.0f}".replace(",", ".") + "₫"


def _build_order_email_html(
    order_code: str,
    customer_name: str,
    final_amount: float,
    items: list[dict],
    shipping_address: str | None,
) -> str:
    items_html = ""
    for item in items:
        items_html += f"""
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #eee">{item['product_name']}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center">{item['quantity']}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right">{_format_vnd(item['unit_price'])}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right">{_format_vnd(item['unit_price']*item['quantity'])}</td>
        </tr>"""

    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Hóa đơn {order_code}</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#C87F45;padding:20px;border-radius:8px 8px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">HÓA ĐƠN THANH TOÁN</h1>
    <p style="color:#fffde7;margin:8px 0 0;font-size:13px">Mã đơn: <strong>{order_code}</strong></p>
  </div>
  <div style="background:#fff;border:1px solid #e0e0e0;border-top:none;padding:20px;border-radius:0 0 8px 8px">
    <p><strong>Khách hàng:</strong> {customer_name}</p>
    <p><strong>Địa chỉ giao hàng:</strong> {shipping_address or '—'}</p>

    <table style="width:100%;border-collapse:collapse;margin-top:16px" cellpadding="0" cellspacing="0">
      <thead>
        <tr style="background:#f5f5f5">
          <th style="padding:10px 8px;text-align:left">Sản phẩm</th>
          <th style="padding:10px 8px;text-align:center">SL</th>
          <th style="padding:10px 8px;text-align:right">Đơn giá</th>
          <th style="padding:10px 8px;text-align:right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>{items_html}</tbody>
    </table>

    <div style="margin-top:16px;text-align:right;font-size:16px">
      <strong>Tổng cộng: <span style="color:#C87F45">{_format_vnd(final_amount)}</span></strong>
    </div>

    <p style="margin-top:24px;font-size:12px;color:#888">
      Cảm ơn quý khách đã đặt hàng tại TechTrace. Nếu có thắc mắc, vui lòng liên hệ hotline 1900 1234.
    </p>
  </div>
</body>
</html>
"""


async def send_order_email(
    to_email: str,
    order_code: str,
    customer_name: str,
    final_amount: float,
    items: list[dict],
    shipping_address: str | None = None,
) -> None:
    """Gửi email hóa đơn cho khách hàng."""
    if not settings.EMAIL_SMTP_HOST:
        print(f"[DEV] Simulating send order email to {to_email} for order {order_code}")
        print(f"Subject: Hóa đơn {order_code} - TechTrace")
        return

    html_body = _build_order_email_html(
        order_code=order_code,
        customer_name=customer_name,
        final_amount=final_amount,
        items=items,
        shipping_address=shipping_address,
    )

    try:
        await asyncio.to_thread(_send_email_sync, to_email, f"Hóa đơn {order_code} - TechTrace", html_body)
    except Exception as e:
        print(f"[EMAIL] Failed to send order email to {to_email}: {e}")
        raise


def _send_email_sync(to_email: str, subject: str, html_body: str) -> None:
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.EMAIL_SMTP_USER or "no-reply@techtrace.vn"
    message["To"] = to_email

    part = MIMEText(html_body, "html", "utf-8")
    message.attach(part)

    with smtplib.SMTP(settings.EMAIL_SMTP_HOST, settings.EMAIL_SMTP_PORT, timeout=15) as server:
        server.starttls()
        if settings.EMAIL_SMTP_USER and settings.EMAIL_SMTP_PASSWORD:
            server.login(settings.EMAIL_SMTP_USER, settings.EMAIL_SMTP_PASSWORD)
        server.sendmail(message["From"], [to_email], message.as_string())


def _format_vnd(v: float) -> str:
    return f"{v:,.0f}".replace(",", ".") + "₫"


async def send_revenue_report_email(
    to_email: str,
    period: str,
    from_date: str,
    to_date: str,
    total_revenue: float,
    order_count: int,
    top_products: list[dict],
) -> None:
    """Gửi email báo cáo doanh thu định kỳ."""
    period_label = {"daily": "ngày", "weekly": "tuần", "monthly": "tháng"}.get(period, period)

    products_html = ""
    for i, p in enumerate(top_products, 1):
        products_html += f"<tr><td style='padding:8px'>{i}</td><td style='padding:8px'>{p['name']}</td><td style='padding:8px;text-align:center'>{p['quantity_sold']}</td><td style='padding:8px;text-align:right'>{_format_vnd(p['revenue'])}</td></tr>"

    html = f"""
<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px">
  <div style="background:#C87F45;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="color:#fff;margin:0">📊 Báo cáo doanh thu TechTrace</h1>
    <p style="color:#fffde7;margin:8px 0 0">Báo cáo {period_label}: {from_date} → {to_date}</p>
  </div>
  <div style="background:#fff;border:1px solid #e0e0e0;border-top:none;padding:20px;border-radius:0 0 8px 8px">
    <div style="display:flex;gap:20px;margin-bottom:20px">
      <div style="flex:1;background:#f5f5f5;padding:16px;border-radius:8px;text-align:center">
        <p style="margin:0;font-size:12px;color:#888">Doanh thu</p>
        <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#C87F45">{_format_vnd(total_revenue)}</p>
      </div>
      <div style="flex:1;background:#f5f5f5;padding:16px;border-radius:8px;text-align:center">
        <p style="margin:0;font-size:12px;color:#888">Số đơn hàng</p>
        <p style="margin:4px 0 0;font-size:22px;font-weight:bold">{order_count}</p>
      </div>
    </div>
    <h3 style="margin:0 0 12px">Top sản phẩm bán chạy</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="background:#f5f5f5"><th style="padding:8px;text-align:center">#</th><th style="padding:8px;text-align:left">Sản phẩm</th><th style="padding:8px;text-align:center">Đã bán</th><th style="padding:8px;text-align:right">Doanh thu</th></tr></thead>
      <tbody>{products_html or '<tr><td colspan="4" style="padding:12px;text-align:center;color:#888">Không có dữ liệu</td></tr>'}</tbody>
    </table>
    <p style="margin-top:20px;font-size:12px;color:#888">Báo cáo được gửi tự động từ TechTrace Admin.</p>
  </div>
</body></html>"""

    if not settings.EMAIL_SMTP_HOST:
        print(f"[DEV] Simulating revenue report email to {to_email}")
        return

    try:
        await asyncio.to_thread(_send_email_sync, to_email, f"Báo cáo doanh thu {period_label} {from_date}→{to_date} - TechTrace", html)
    except Exception as e:
        print(f"[EMAIL] Failed to send revenue report to {to_email}: {e}")
        raise
