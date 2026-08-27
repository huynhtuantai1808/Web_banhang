import smtplib
from email.message import EmailMessage
from datetime import datetime
from app.core.config import settings
from app.models.order import Order
from app.models.customer import Customer

# Hàm tiện ích format tiền tệ
def format_vnd(amount: int) -> str:
    if amount is None:
        return "0 ₫"
    return f"{amount:,.0f} ₫".replace(",", ".")

def format_date(dt: datetime) -> str:
    if not dt:
        return ""
    return dt.strftime("%d/%m/%Y %H:%M")


def _send_email_smtp(subject: str, html_content: str, to_email: str):
    if not to_email:
        print("Cannot send email: recipient address is empty")
        return
        
    if not settings.EMAIL_SMTP_HOST:
        print(f"--- MOCK EMAIL TO {to_email} ---")
        print(f"Subject: {subject}")
        print("Body:")
        print(html_content)
        print("-------------------------------")
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_SMTP_USER or "no-reply@electronicsshop.local"
    msg["To"] = to_email
    msg.set_content("Please enable HTML in your email client to view this message.")
    msg.add_alternative(html_content, subtype="html")

    try:
        with smtplib.SMTP(settings.EMAIL_SMTP_HOST, settings.EMAIL_SMTP_PORT) as server:
            if settings.EMAIL_SMTP_USER and settings.EMAIL_SMTP_PASSWORD:
                server.starttls()
                server.login(settings.EMAIL_SMTP_USER, settings.EMAIL_SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise e


def send_order_confirmation(order: Order, user: Customer = None, guest_email: str = None):
    to_email = user.email if user else guest_email
    if not to_email:
        return

    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #007bff;">Xác nhận đơn hàng của bạn</h2>
        <p>Cảm ơn bạn đã đặt hàng tại cửa hàng chúng tôi!</p>
        <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Mã đơn:</strong> {order.order_code}</p>
            <p style="margin: 0;"><strong>Đặt ngày:</strong> {format_date(order.created_at)}</p>
            <p style="margin: 0;"><strong>Trạng thái:</strong> {order.status.upper()}</p>
        </div>
        <p>Chúng tôi đang xử lý đơn hàng và sẽ liên hệ với bạn trong thời gian sớm nhất.</p>
        <p>Trân trọng,<br>Đội ngũ Electronics Shop</p>
    </body>
    </html>
    """
    _send_email_smtp(f"Xác nhận đơn hàng {order.order_code}", html_content, to_email)


def send_electronic_invoice(order: Order, items: list, user: Customer = None, guest_email: str = None):
    to_email = user.email if user else guest_email
    if not to_email:
        return
        
    buyer_name = user.full_name if user else "Khách vãng lai"
    
    # Calculate tax (10% standard for demonstration, or 0% depending on business logic)
    tax_rate = 0.10
    total_amount_float = float(order.total_amount)
    total_before_tax = int(total_amount_float / (1 + tax_rate))
    tax_amount = total_amount_float - total_before_tax
    
    items_html = ""
    for item in items:
        items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">{item['product_name']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">{item['quantity']}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">{format_vnd(item['unit_price'])}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">{format_vnd(item['unit_price'] * item['quantity'])}</td>
        </tr>
        """

    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px;">
            <h1 style="color: #d70018; margin: 0 0 10px 0;">HÓA ĐƠN ĐIỆN TỬ</h1>
            <p style="margin: 5px 0;"><strong>Mẫu số:</strong> 01GTKT0/001 - <strong>Ký hiệu:</strong> AA/26E - <strong>Số hóa đơn:</strong> {order.order_code}</p>
            <p style="margin: 5px 0;"><strong>Ngày lập:</strong> {format_date(order.created_at)}</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div style="width: 48%;">
                <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Thông tin người bán</h3>
                <p><strong>CÔNG TY TNHH ELECTRONICS SHOP</strong></p>
                <p><strong>MST:</strong> 0123456789</p>
                <p><strong>Địa chỉ:</strong> 123 Đường Công Nghệ, Quận 1, TP.HCM</p>
            </div>
            <div style="width: 48%;">
                <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Thông tin người mua</h3>
                <p><strong>Khách hàng:</strong> {buyer_name}</p>
                <p><strong>Địa chỉ giao hàng:</strong> {order.shipping_address or 'Không có'}</p>
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <p><strong>Mã đơn hàng:</strong> {order.order_code}</p>
            <p><strong>Trạng thái thanh toán:</strong> {order.payment_status.upper()}</p>
            <p><strong>Phương thức:</strong> {order.payment_method.upper()} ({order.payment_gateway.upper()})</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
                <tr style="background-color: #f8f9fa;">
                    <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: left;">Sản phẩm</th>
                    <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: center;">SL</th>
                    <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: right;">Đơn giá</th>
                    <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: right;">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>

        <div style="width: 300px; float: right; text-align: right;">
            <p style="display: flex; justify-content: space-between;"><span>Tiền hàng (chưa VAT):</span> <strong>{format_vnd(total_before_tax)}</strong></p>
            <p style="display: flex; justify-content: space-between;"><span>Thuế GTGT (10%):</span> <strong>{format_vnd(tax_amount)}</strong></p>
            <p style="display: flex; justify-content: space-between;"><span>Phí vận chuyển:</span> <strong>0 ₫</strong></p>
            <p style="display: flex; justify-content: space-between; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; font-size: 1.2em; color: #d70018;">
                <span>Tổng tiền:</span> <strong>{format_vnd(order.final_amount)}</strong>
            </p>
        </div>
        <div style="clear: both;"></div>

        <div style="margin-top: 40px; text-align: center; font-size: 0.9em; color: #666; border-top: 1px solid #ccc; padding-top: 20px;">
            <p>Tra cứu hóa đơn điện tử tại: <a href="https://electronicsshop.local/invoice">https://electronicsshop.local/invoice</a></p>
            <p>Mã xác thực: {order.id}</p>
        </div>
    </body>
    </html>
    """
    _send_email_smtp(f"Hóa đơn điện tử - Đơn hàng {order.order_code}", html_content, to_email)


async def send_revenue_report_email(to_email: str, period: str, from_date: str, to_date: str, total_revenue: float, order_count: int, top_products: list):
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #007bff;">Báo cáo doanh thu: {period.upper()}</h2>
        <p>Từ ngày <strong>{from_date}</strong> đến <strong>{to_date}</strong></p>
        <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;"><strong>Tổng doanh thu:</strong> {format_vnd(int(total_revenue))}</p>
            <p style="margin: 0; font-size: 16px;"><strong>Số đơn hàng:</strong> {order_count}</p>
        </div>
        
        <h3>Top Sản Phẩm Bán Chạy</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: #f8f9fa;">
                    <th style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">Sản phẩm</th>
                    <th style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">Đã bán</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for item in top_products:
        html_content += f"""
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">{item.get('name', 'N/A')}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{item.get('quantity_sold', 0)}</td>
                </tr>
        """
        
    html_content += """
            </tbody>
        </table>
        
        <p>Trân trọng,<br>Hệ thống Electronics Shop</p>
    </body>
    </html>
    """
    _send_email_smtp(f"Báo cáo doanh thu {period.upper()}", html_content, to_email)
