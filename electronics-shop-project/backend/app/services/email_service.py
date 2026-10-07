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

from datetime import datetime, timezone, timedelta

def format_date(dt: datetime) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone(timedelta(hours=7))).strftime("%d/%m/%Y %H:%M")


def _send_email_smtp(subject: str, html_content: str, to_email: str, attachments: list = None):
    if not to_email:
        print("Cannot send email: recipient address is empty")
        return
        
    if not settings.EMAIL_SMTP_HOST:
        print(f"--- MOCK EMAIL TO {to_email} ---")
        print(f"Subject: {subject}")
        print("Body:")
        print(html_content)
        if attachments:
            print(f"Attachments: {[a['filename'] for a in attachments]}")
        print("-------------------------------")
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_SMTP_USER or "no-reply@electronicsshop.local"
    msg["To"] = to_email
    msg.set_content("Please enable HTML in your email client to view this message.")
    msg.add_alternative(html_content, subtype="html")

    if attachments:
        for attachment in attachments:
            msg.add_attachment(
                attachment['content'],
                maintype=attachment['maintype'],
                subtype=attachment['subtype'],
                filename=attachment['filename']
            )

    try:
        with smtplib.SMTP(settings.EMAIL_SMTP_HOST, settings.EMAIL_SMTP_PORT) as server:
            if settings.EMAIL_SMTP_USER and settings.EMAIL_SMTP_PASSWORD:
                server.starttls()
                server.login(settings.EMAIL_SMTP_USER, settings.EMAIL_SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"Error sending email: {e}")
        raise e


def send_order_confirmation(order: Order, items: list = None, user: Customer = None, guest_email: str = None):
    to_email = user.email if user else guest_email
    if not to_email:
        return
        
    items_html = ""
    if items:
        items_html = """
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
                <tr style="background-color: #f8f9fa;">
                    <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: left;">Sản phẩm</th>
                    <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: center;">SL</th>
                    <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: right;">Đơn giá</th>
                </tr>
            </thead>
            <tbody>
        """
        for item in items:
            items_html += f"""
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">{item['product_name']}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">{item['quantity']}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">{format_vnd(item['unit_price'])}</td>
                </tr>
            """
        items_html += """
            </tbody>
        </table>
        """

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
        {items_html}
        <p>Chúng tôi đang xử lý đơn hàng và sẽ liên hệ với bạn trong thời gian sớm nhất.</p>
        <p>Trân trọng,<br>Đội ngũ Electronics Shop</p>
    </body>
    </html>
    """
    _send_email_smtp(f"Xác nhận đơn hàng {order.order_code}", html_content, to_email)


def send_electronic_invoice(order: Order, items: list, user: Customer = None, guest_email: str = None, plan = None):
    import re
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

    # Xác định trạng thái thanh toán hiển thị
    if order.payment_method == "installment" or order.payment_gateway in ["credit_card", "finance"]:
        payment_status_text = "Thanh toán theo kỳ hạn"
    elif order.payment_status == "paid":
        payment_status_text = "Đã thanh toán"
    elif order.payment_gateway == "cod":
        payment_status_text = "Chờ thanh toán"
    else:
        status_map = {
            "paid": "Đã thanh toán",
            "pending": "Chờ thanh toán",
            "overdue": "Quá hạn",
            "refunded": "Đã hoàn tiền"
        }
        payment_status_text = status_map.get(order.payment_status, order.payment_status.upper())

    # Xử lý địa chỉ giao hàng và trích xuất phương thức trả góp
    shipping_address = order.shipping_address or 'Không có'
    installment_note = ""
    if "Trả góp" in shipping_address:
        match = re.search(r'\[(Trả góp:.*?)\]', shipping_address)
        if match:
            installment_note = match.group(1)
            shipping_address = shipping_address.replace(match.group(0), "").strip()

    # Xác định phương thức thanh toán hiển thị
    gateway_map = {
        "vnpay": "VNPay",
        "cod": "Tiền mặt (COD)",
        "credit_card": "Trả góp (Thẻ tín dụng)",
        "finance": "Trả góp (Công ty tài chính)"
    }
    payment_method_text = gateway_map.get(order.payment_gateway, order.payment_gateway.upper())
    if installment_note:
        if "Trả góp" in payment_method_text:
            payment_method_text = installment_note
        else:
            payment_method_text += f" - {installment_note}"
        
    installment_html = ""
    if plan:
        due_date = f"Ngày {plan.created_at.day} hàng tháng" if plan.created_at else "Hàng tháng"
        end_date = plan.created_at + timedelta(days=30 * plan.total_months) if plan.created_at else None
        end_date_str = format_date(end_date).split(" ")[0] if end_date else ""
        installment_html = f"""
        <div style="background-color: #f0f7ff; padding: 15px; margin-bottom: 20px; border-left: 4px solid #0056b3; border-radius: 4px;">
            <h4 style="margin-top: 0; margin-bottom: 10px; color: #0056b3;">Chi tiết trả góp</h4>
            <p style="margin: 3px 0;"><strong>Thời hạn:</strong> {plan.total_months} tháng</p>
            <p style="margin: 3px 0;"><strong>Thanh toán mỗi tháng:</strong> {format_vnd(float(plan.monthly_amount))}</p>
            <p style="margin: 3px 0;"><strong>Thời hạn đóng tiền hàng tháng:</strong> {due_date}</p>
            <p style="margin: 3px 0;"><strong>Ngày kết thúc (dự kiến):</strong> {end_date_str}</p>
        </div>
        """

    html_content = f"""
    <html>
    <body style="font-family: Arial; line-height: 1.4; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="color: #d70018; margin: 0 0 10px 0;">HÓA ĐƠN ĐIỆN TỬ</h1>
            <p style="margin: 3px 0;"><strong>Mẫu số:</strong> 01GTKT0/001 - <strong>Ký hiệu:</strong> AA/26E - <strong>Số hóa đơn:</strong> {order.order_code}</p>
            <p style="margin: 3px 0;"><strong>Ngày lập:</strong> {format_date(order.created_at)}</p>
        </div>

        <table style="width: 100%; margin-bottom: 20px;" border="0" cellpadding="0" cellspacing="0">
            <tr>
                <td style="width: 48%; vertical-align: top;">
                    <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px;">Thông tin người bán</h3>
                    <p style="margin: 3px 0;"><strong>CÔNG TY TNHH ELECTRONICS SHOP</strong></p>
                    <p style="margin: 3px 0;"><strong>MST:</strong> 0123456789</p>
                    <p style="margin: 3px 0;"><strong>Địa chỉ:</strong> 123 Đường Công Nghệ, Quận 1, TP.HCM</p>
                </td>
                <td style="width: 4%;"></td>
                <td style="width: 48%; vertical-align: top;">
                    <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px;">Thông tin người mua</h3>
                    <p style="margin: 3px 0;"><strong>Khách hàng:</strong> {buyer_name}</p>
                    <p style="margin: 3px 0;"><strong>Địa chỉ giao hàng:</strong> {shipping_address}</p>
                </td>
            </tr>
        </table>

        <div style="margin-bottom: 20px;">
            <p style="margin: 3px 0;"><strong>Mã đơn hàng:</strong> {order.order_code}</p>
            <p style="margin: 3px 0;"><strong>Trạng thái thanh toán:</strong> {payment_status_text}</p>
            <p style="margin: 3px 0;"><strong>Phương thức:</strong> {payment_method_text}</p>
        </div>
        
        {installment_html.replace('display: flex;', '').replace('justify-content: space-between;', '')}

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: #f8f9fa;">
                    <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: left;">Sản phẩm</th>
                    <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: center;">SL</th>
                    <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Đơn giá</th>
                    <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>

        <div style="width: 350px; float: right;">
            <table style="width: 100%;" border="0" cellpadding="3" cellspacing="0">
                <tr><td style="text-align: left;">Tiền hàng (chưa VAT):</td><td style="text-align: right;"><strong>{format_vnd(total_before_tax)}</strong></td></tr>
                <tr><td style="text-align: left;">Thuế GTGT (10%):</td><td style="text-align: right;"><strong>{format_vnd(tax_amount)}</strong></td></tr>
                <tr><td style="text-align: left;">Phí vận chuyển:</td><td style="text-align: right;"><strong>0 ₫</strong></td></tr>
                {f'<tr><td style="text-align: left;">Bảo hiểm điện tử:</td><td style="text-align: right;"><strong>{format_vnd(order.insurance_fee)}</strong></td></tr>' if getattr(order, 'insurance_fee', 0) > 0 else ""}
                {f'<tr><td style="text-align: left; color: #d70018;">Giảm giá:</td><td style="text-align: right; color: #d70018;"><strong>-{format_vnd(order.discount_amount)}</strong></td></tr>' if order.discount_amount > 0 else ""}
                <tr><td colspan="2"><div style="border-top: 2px solid #333; margin: 5px 0;"></div></td></tr>
                <tr><td style="text-align: left; font-size: 1.2em; color: #d70018;">Tổng tiền:</td><td style="text-align: right; font-size: 1.2em; color: #d70018;"><strong>{format_vnd(order.final_amount - getattr(order, 'shipping_fee', 0))}</strong></td></tr>
            </table>
        </div>
        <div style="clear: both;"></div>

        <div style="margin-top: 30px; text-align: center; font-size: 0.9em; color: #666; border-top: 1px solid #ccc; padding-top: 15px;">
            <p style="margin: 3px 0;">Tra cứu hóa đơn điện tử tại: <a href="https://electronicsshop.local/invoice">https://electronicsshop.local/invoice</a></p>
            <p style="margin: 3px 0;">Mã xác thực: {order.id}</p>
        </div>
    </body>
    </html>
    """
    
    attachments = []
    try:
        from xhtml2pdf import pisa
        import io
        pdf_buffer = io.BytesIO()
        
        import os
        font_dir = os.path.join(os.getcwd(), 'app', 'static', 'fonts').replace('\\', '/')
        
        pdf_head = f"""<html>
        <head>
            <meta charset="utf-8">
            <style>
                @font-face {{
                    font-family: Arial;
                    src: url('{font_dir}/arial.ttf');
                }}
                @font-face {{
                    font-family: Arial;
                    src: url('{font_dir}/arial-bold.ttf');
                    font-weight: bold;
                }}
                body {{
                    font-family: Arial;
                }}
            </style>
        </head>"""
        
        pdf_html = html_content.replace('<html>', pdf_head).replace('font-family: Arial, sans-serif;', 'font-family: Arial;')
        
        pisa_status = pisa.CreatePDF(
            pdf_html, dest=pdf_buffer, encoding='utf-8'
        )
        if not pisa_status.err:
            pdf_content = pdf_buffer.getvalue()
            attachments.append({
                "content": pdf_content,
                "maintype": "application",
                "subtype": "pdf",
                "filename": f"Hoa_don_{order.order_code}.pdf"
            })
    except Exception as e:
        print(f"Lỗi tạo PDF: {e}")

    _send_email_smtp(f"Hóa đơn điện tử - Đơn hàng {order.order_code}", html_content, to_email, attachments)


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


def send_preorder_arrived_notification(product_name: str, to_email: str, order_code: str):
    if not to_email:
        return
        
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #28a745;">Sản phẩm đặt trước đã có hàng!</h2>
        <p>Xin chào,</p>
        <p>Chúng tôi vui mừng thông báo rằng sản phẩm bạn đặt trước hiện đã có sẵn tại cửa hàng:</p>
        <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;"><strong>Sản phẩm:</strong> {product_name}</p>
            <p style="margin: 0; font-size: 16px;"><strong>Mã đơn hàng:</strong> {order_code}</p>
        </div>
        <p>Đơn hàng của bạn sẽ sớm được xử lý và giao đến bạn. Cảm ơn bạn đã kiên nhẫn chờ đợi.</p>
        <p>Trân trọng,<br>Đội ngũ Electronics Shop</p>
    </body>
    </html>
    """
    _send_email_smtp(f"Sản phẩm {product_name} đã có hàng!", html_content, to_email)
