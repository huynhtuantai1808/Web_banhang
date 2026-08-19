# WEBSITE BÁN ĐỒ ĐIỆN TỬ — TÀI LIỆU KIẾN TRÚC HỆ THỐNG

## 1. Tổng quan Stack

| Thành phần | Công nghệ |
|---|---|
| Backend | Python (FastAPI) |
| Frontend | Next.js (App Router) + TailwindCSS + Framer Motion |
| Database | PostgreSQL |
| Cache / Session / OTP | Redis |
| ORM | SQLAlchemy 2.0 + Alembic (migration) |
| Auth | JWT (access + refresh) + OTP (SMS/Email) qua Redis TTL |
| Config | `.env` (không hard-code thông tin kết nối) |

Kiến trúc theo mô hình **3 lớp**:

```
Next.js (Client + Admin)  <-->  FastAPI (REST API)  <-->  PostgreSQL
                                        |
                                      Redis (cache, OTP, cart session, rate-limit)
```

---

## 2. Cấu trúc thư mục

### Backend
```
backend/
├── app/
│   ├── main.py                  # Khởi tạo FastAPI app
│   ├── core/
│   │   ├── config.py            # Đọc biến môi trường (.env)
│   │   ├── security.py          # Hash password, JWT
│   │   └── redis_client.py      # Kết nối Redis
│   ├── db/
│   │   ├── base.py               # Base model + import models
│   │   └── session.py            # Session/engine PostgreSQL
│   ├── models/                   # SQLAlchemy models
│   │   ├── customer.py
│   │   ├── employee.py
│   │   ├── product.py
│   │   ├── inventory.py
│   │   ├── order.py
│   │   ├── cart.py
│   │   ├── promotion.py
│   │   └── installment.py
│   ├── schemas/                  # Pydantic schemas (request/response)
│   ├── api/v1/endpoints/
│   │   ├── auth.py               # Đăng ký/đăng nhập + OTP
│   │   ├── customers.py
│   │   ├── employees.py          # Quản lý tài khoản nhân viên
│   │   ├── products.py
│   │   ├── inventory.py          # Nhập/xuất kho
│   │   ├── categories.py         # Danh mục hãng/giá/loại/chức năng
│   │   ├── cart.py
│   │   ├── orders.py
│   │   ├── installment.py        # Mua trả góp
│   │   ├── promotions.py
│   │   └── search.py
│   ├── services/
│   │   ├── otp_service.py
│   │   ├── promotion_service.py
│   │   ├── installment_service.py
│   │   └── inventory_service.py
│   └── utils/
├── alembic/                       # Migration scripts
├── requirements.txt
└── .env.example
```

### Frontend
```
frontend/
├── app/
│   ├── (shop)/                    # Giao diện người dùng
│   │   ├── page.tsx               # Trang chủ
│   │   ├── products/[slug]/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── login/page.tsx
│   │   └── otp/page.tsx
│   ├── (admin)/admin/             # Trang quản trị nhân viên
│   │   ├── dashboard/page.tsx
│   │   ├── products/page.tsx
│   │   ├── inventory/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── customers/page.tsx
│   │   └── promotions/page.tsx
│   └── layout.tsx
├── components/
│   ├── ProductCard.tsx            # Có animation (Framer Motion)
│   ├── FilterTabs.tsx             # Tab hãng/giá/loại/chức năng
│   ├── SearchBar.tsx
│   └── admin/*
├── lib/api.ts                     # Axios/fetch wrapper gọi BE
└── package.json
```

---

## 3. Danh sách tính năng → Module tương ứng

| Tính năng yêu cầu | Module Backend | Bảng DB liên quan |
|---|---|---|
| Mua bán sản phẩm | `orders`, `cart` | orders, order_items, carts |
| Nhập/xuất kho (quản lý) | `inventory` | inventory_transactions, products |
| Mua trả góp | `installment` | installment_plans, installment_payments |
| Tab chọn sản phẩm (hãng/giá/loại/chức năng) | `categories`, `products` | brands, categories, products |
| Chiết khấu | `promotions` | discount_rules |
| Khuyến mãi | `promotions` | promotions, promotion_customer |
| Thông tin khách hàng + mã KH | `customers` | customers |
| Phân bổ mã KM theo khách hàng | `promotions` | promotion_customer |
| Tra cứu đơn hàng | `orders` | orders |
| Đăng ký/đăng nhập user | `auth` | customers, otp_codes |
| Tài khoản nhân viên quản lý | `employees` | employees, roles |
| Giỏ hàng theo khách | `cart` | carts, cart_items |
| Thanh tìm kiếm sản phẩm | `search` | products (full-text index) |
| Xác thực OTP khi login | `auth` + Redis | otp_codes (TTL trong Redis) |

---

## 4. Luồng OTP đăng nhập (tóm tắt)
1. User nhập số điện thoại/email + mật khẩu → BE xác thực mật khẩu.
2. BE sinh OTP 6 số, lưu vào Redis với key `otp:{user_id}` TTL 300s.
3. Gửi OTP qua SMS/Email (tách riêng service, có thể mock ở giai đoạn dev).
4. User nhập OTP → BE so khớp với Redis → nếu đúng, cấp JWT access/refresh token.
5. Giới hạn số lần nhập sai (rate-limit bằng Redis) để chống brute-force.

---

## 5. Bảo mật & vận hành
- Toàn bộ secret (DB URL, Redis URL, JWT secret, SMS/Email API key) nằm trong `.env`, không commit lên git (`.gitignore` chứa `.env`).
- Mật khẩu hash bằng bcrypt/argon2.
- Rate-limit API nhạy cảm (login, OTP) qua Redis.
- Phân quyền nhân viên theo `role` (admin, sale, kho...) — middleware kiểm tra JWT scope.

---

## 6. Các bước triển khai đề xuất
1. **Giai đoạn 1**: Thiết lập DB schema + scaffold FastAPI + kết nối Redis/PostgreSQL qua `.env`.
2. **Giai đoạn 2**: Module Auth (đăng ký/đăng nhập + OTP) + Customer + Employee.
3. **Giai đoạn 3**: Module Product/Category/Inventory (nhập-xuất kho).
4. **Giai đoạn 4**: Cart + Order + Installment (trả góp).
5. **Giai đoạn 5**: Promotion/Discount + phân bổ theo khách hàng.
6. **Giai đoạn 6**: Frontend Shop (animation) + Frontend Admin.

*(Tài liệu này đi kèm scaffold code khởi tạo cho Giai đoạn 1–2 trong cùng gói file.)*
