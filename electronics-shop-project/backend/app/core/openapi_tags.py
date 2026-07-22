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
        "name": "Health",
        "description": "Kiểm tra tình trạng hoạt động của API.",
    },
]
