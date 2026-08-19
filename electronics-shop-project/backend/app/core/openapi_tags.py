"""Metadata mô tả các nhóm API — hiển thị trong Swagger UI (/docs)."""

TAGS_METADATA = [
    {
        "name": "Auth",
        "description": "Đăng ký tài khoản, đăng nhập 2 bước (mật khẩu + OTP), cấp JWT token.",
    },
    {
        "name": "Products",
        "description": "Tra cứu, tìm kiếm, lọc sản phẩm theo hãng/danh mục/giá. "
        "Thao tác tạo/sửa/xoá dành cho nhân viên quản lý.",
    },
    {
        "name": "Product Import/Media",
        "description": "Nhập dữ liệu sản phẩm hàng loạt từ file Excel/CSV và tải ảnh sản phẩm lên từ client.",
    },
    {
        "name": "Inventory (Quản lý kho)",
        "description": "Ghi nhận nhập/xuất kho, tra cứu lịch sử tồn kho theo sản phẩm.",
    },
    {
        "name": "Employees (Nhân viên)",
        "description": "Đăng nhập tài khoản nhân viên quản lý (nội bộ, không tự đăng ký công khai).",
    },
    {
        "name": "Categories & Brands",
        "description": "Tra cứu danh sách hãng và danh mục hiện có (đọc công khai, dùng để gợi ý khi nhập sản phẩm).",
    },
    {
        "name": "Cart (Giỏ hàng)",
        "description": "Thêm/xem/sửa/xoá sản phẩm trong giỏ hàng — chỉ khách hàng đã đăng nhập.",
    },
    {
        "name": "Orders (Đơn hàng)",
        "description": "Tạo đơn hàng từ giỏ hàng (chọn cổng thanh toán COD/VNPay), tra cứu đơn hàng.",
    },
    {
        "name": "Orders Management (Admin)",
        "description": "Xem toàn bộ đơn hàng của khách (nhân viên), cập nhật trạng thái đơn — dành cho quản lý bán hàng.",
    },
    {
        "name": "Shipping (Vận chuyển)",
        "description": "Gán/cập nhật thông tin vận chuyển cho đơn hàng, khách hàng theo dõi tình trạng giao hàng, webhook nhận cập nhật từ đơn vị vận chuyển.",
    },
    {
        "name": "Payments (Cổng thanh toán)",
        "description": "Callback xử lý kết quả thanh toán từ cổng VNPay.",
    },
    {
        "name": "Site Settings (Giao diện Storefront)",
        "description": "Đọc (công khai) / sửa (admin) cấu hình hiển thị trang chủ: tên shop, banner, màu chủ đạo, logo.",
    },
    {
        "name": "Promotions (Khuyến mãi)",
        "description": "CRUD mã khuyến mãi (admin), phân bổ theo từng khách hàng, khách hàng xem/kiểm tra mã trước khi đặt hàng.",
    },
    {
        "name": "Discount Rules (Chiết khấu tự động)",
        "description": "Quy tắc chiết khấu TỰ ĐỘNG theo hãng/danh mục/số lượng — không cần khách nhập mã, khác với Promotions.",
    },
    {
        "name": "Installment (Trả góp)",
        "description": "Máy tính trả góp công khai, xem lịch trả góp theo từng kỳ của một đơn hàng.",
    },
    {
        "name": "Customers (Khách hàng — Admin)",
        "description": "Danh sách/chi tiết khách hàng, khoá-mở khoá tài khoản — chỉ Quản lý (admin).",
    },
    {
        "name": "Health",
        "description": "Kiểm tra tình trạng hoạt động của API.",
    },
]
