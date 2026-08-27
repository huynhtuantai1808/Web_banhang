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
│   │   ├── installment.py
│   │   ├── banner.py
│   │   ├── settings.py
│   │   ├── shipment.py
│   │   ├── wishlist.py
│   │   ├── review.py
│   │   └── blog_post.py
│   ├── schemas/                  # Pydantic schemas (request/response)
│   │   ├── auth.py
│   │   ├── customer.py
│   │   ├── employee.py
│   │   ├── product.py
│   │   ├── order.py
│   │   ├── cart.py
│   │   ├── promotion.py
│   │   ├── discount_rule.py
│   │   ├── installment.py
│   │   ├── banner.py
│   │   ├── settings.py
│   │   ├── shipment.py
│   │   ├── wishlist.py
│   │   ├── review.py
│   │   └── blog_post.py
│   ├── api/v1/endpoints/
│   │   ├── auth.py               # Đăng ký/đăng nhập + OTP
│   │   ├── employees.py          # Quản lý tài khoản nhân viên
│   │   ├── products.py
│   │   ├── product_media.py       # Upload/xoá ảnh sản phẩm
│   │   ├── inventory.py           # Nhập/xuất kho
│   │   ├── catalog.py             # Danh mục: brands, categories (CRUD + banner)
│   │   ├── cart.py
│   │   ├── orders.py             # Tạo đơn, guest checkout, tra cứu
│   │   ├── admin_orders.py       # Admin xem/sửa đơn hàng
│   │   ├── payments.py           # Thanh toán COD/VNPay (return + IPN)
│   │   ├── settings.py           # Tuỳ chỉnh giao diện storefront
│   │   ├── promotions.py         # Mã khuyến mãi + phân bổ
│   │   ├── discount_rules.py     # Chiết khấu tự động
│   │   ├── installment.py        # Máy tính trả góp + lịch kỳ
│   │   ├── customers.py         # Quản lý khách hàng
│   │   ├── shipments.py          # Vận chuyển + webhook
│   │   ├── wishlist.py
│   │   ├── banners.py           # Banner quảng cáo
│   │   ├── blog.py              # Tin tức / Khuyến mãi
│   │   ├── reports.py           # Báo cáo doanh thu
│   ├── services/
│   │   ├── otp_service.py
│   │   ├── promotion_service.py
│   │   ├── discount_rule_service.py
│   │   ├── installment_service.py
│   │   ├── inventory_service.py
│   │   ├── vnpay_service.py
│   │   ├── shipping_service.py
│   │   ├── file_service.py
│   │   └── catalog_service.py
│   └── utils/
├── alembic/                       # Migration scripts
├── requirements.txt
└── .env.example
```

### Frontend
```
frontend/
├── app/
│   ├── page.tsx                   # Trang chủ (product grid, search, category menu)
│   ├── products/[id]/page.tsx    # Chi tiết sản phẩm
│   ├── category/[slug]/page.tsx  # Trang danh mục (breadcrumb + banner)
│   ├── cart/page.tsx
│   ├── checkout/page.tsx
│   ├── orders/page.tsx            # Danh sách đơn hàng
│   ├── orders/[id]/page.tsx      # Chi tiết đơn hàng
│   ├── orders/lookup/page.tsx     # Tra cứu đơn (guest)
│   ├── orders/result/page.tsx     # Kết quả thanh toán
│   ├── wishlist/page.tsx
│   ├── news/page.tsx              # Tin tức
│   ├── news/[slug]/page.tsx       # Chi tiết tin tức
│   ├── promotions/page.tsx       # Khuyến mãi
│   ├── promotions/[slug]/page.tsx # Chi tiết khuyến mãi
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── contact/page.tsx
│   ├── admin/(protected)/         # Route group cho admin (shared layout)
│   │   ├── orders/page.tsx
│   │   ├── invoices/page.tsx
│   │   ├── products/page.tsx
│   │   ├── inventory/page.tsx
│   │   ├── categories/page.tsx     # Hãng & Danh mục (CRUD)
│   │   ├── promotions/page.tsx
│   │   ├── banners/page.tsx
│   │   ├── posts/page.tsx         # Quản lý bài viết (Tin tức/KM)
│   │   ├── installments/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── customers/[id]/edit/page.tsx
│   │   ├── users/page.tsx
│   │   ├── users/[id]/edit/page.tsx
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
│   └── admin/login/page.tsx
├── components/
│   ├── SiteHeader.tsx             # Thanh nav công khai + auth
│   ├── SiteFooter.tsx            # Footer thông tin cửa hàng
│   ├── CategoryMenu.tsx          # Mega-menu danh mục cha/con
│   ├── ProductCard.tsx          # Card sản phẩm (Framer Motion)
│   ├── ProductRow.tsx           # Hàng sản phẩm theo nhóm
│   ├── FilterTabs.tsx            # Lọc hãng/giá/chức năng
│   ├── BannerCarousel.tsx       # Carousel banner trang chủ
│   ├── ChatWidget.tsx            # Chatbot FAQ
│   ├── Logo.tsx
│   └── admin/*                   # Admin form components
├── lib/
│   ├── apiClient.ts              # Axios instance, auto token, error handler
│   ├── auth-storage.ts          # Token employee/customer
│   ├── branding.ts              # Tên/logo/tagline mặc định
│   ├── chatbotData.ts          # Nội dung chatbot FAQ
│   ├── config.ts
│   ├── media.ts
│   └── services/                # API calls theo domain
│       ├── products.ts, cart.ts, orders.ts, auth.ts
│       ├── promotions.ts, banners.ts, blog.ts
│       └── employees.ts, customers.ts, settings.ts
└── package.json
```

---

## 3. Danh sách tính năng → Module tương ứng

| Tính năng yêu cầu | Module Backend | Bảng DB liên quan |
|---|---|---|
| Mua bán sản phẩm | `orders`, `cart` | orders, order_items, carts |
| Nhập/xuất kho (quản lý) | `inventory` | inventory_transactions, products |
| Mua trả góp | `installment` | installment_plans, installment_payments |
| Tab chọn sản phẩm (hãng/giá/loại/chức năng) | `catalog`, `products` | brands, categories, products |
| Chiết khấu tự động | `discount_rules` | discount_rules |
| Khuyến mãi (mã giảm giá) | `promotions` | promotions, promotion_customer |
| Thông tin khách hàng + mã KH | `customers` | customers |
| Phân bổ mã KM theo khách hàng | `promotions` | promotion_customer |
| Tra cứu đơn hàng | `orders`, `guest` | orders |
| Đăng ký/đăng nhập user | `auth` | customers, otp_codes |
| Tài khoản nhân viên quản lý | `employees` | employees, roles |
| Giỏ hàng theo khách | `cart` | carts, cart_items |
| Tìm kiếm sản phẩm | `products` | products (keyword + filter) |
| Xác thực OTP khi login | `auth` + Redis | otp_codes (TTL trong Redis) |
| Banner quảng cáo trang chủ | `banners` | banners |
| Tuỳ chỉnh giao diện storefront | `settings` | site_settings |
| Vận chuyển + webhook | `shipments` | shipments, shipment_status_logs |
| Yêu thích sản phẩm | `wishlist` | wishlists |
| Đánh giá sản phẩm | `reviews` | product_reviews |
| Tin tức / Khuyến mãi | `blog` | blog_posts |
| Báo cáo doanh thu | `reports` | orders (aggregate query) |
| Thanh toán VNPay | `payments` | orders.payment_gateway |

---

## 4. Luồng OTP đăng nhập & Xác thực

**Luồng OTP:**
1. User nhập số điện thoại/email + mật khẩu → BE xác thực mật khẩu.
2. BE sinh OTP 6 số, lưu vào Redis với key `otp:{user_id}` TTL 300s.
3. Gửi OTP qua SMS/Email (tách riêng service, có thể mock ở giai đoạn dev).
4. User nhập OTP → BE so khớp với Redis → nếu đúng, cấp JWT access/refresh token.
5. Giới hạn số lần nhập sai (rate-limit bằng Redis) để chống brute-force.

**JWT access token** chứa: `sub` (user_id), `employee_role` (`admin`|`staff`), `permissions`
(JSONB: `can_create/can_edit/can_delete`). Token khách hàng riêng biệt (`customer_token`),
token nhân viên riêng biệt (`employee_token`), phân biệt qua route:
- `/cart/*`, `/orders/*`, `/wishlist/*`, `/promotions/mine`, `/promotions/validate` → customer token
- Còn lại (kể cả `/products/*` GET) → employee token

Hai cấp phân quyền:
1. `require_admin` — chỉ role `admin` (Quản lý) được phép
2. `require_permission("can_create"|"can_edit"|"can_delete")` — kiểm tra JSONB permissions;
   admin luôn bypass

---

## 5. Bảo mật & vận hành
- Toàn bộ secret (DB URL, Redis URL, JWT secret, SMS/Email API key) nằm trong `.env`, không commit lên git (`.gitignore` chứa `.env`).
- Mật khẩu hash bằng bcrypt/argon2.
- Rate-limit API nhạy cảm (login, OTP) qua Redis.
- Phân quyền nhân viên theo `role` (admin, sale, kho...) — middleware kiểm tra JWT scope.

---

## 6. Các bước triển khai đề xuất

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | DB schema + scaffold FastAPI + Redis/Postgres | ✅ Hoàn thành |
| 2 | Auth (đăng ký/đăng nhập + OTP) + Customer + Employee | ✅ Hoàn thành |
| 3 | Product/Category/Inventory (nhập-xuất kho) + Import Excel | ✅ Hoàn thành |
| 4 | Cart + Order + Installment (trả góp) | ✅ Hoàn thành |
| 5 | Promotion/Discount + phân bổ theo khách hàng | ✅ Hoàn thành |
| 6 | Thanh toán COD + VNPay (Return + IPN) | ✅ Hoàn thành |
| 7 | Shipping thủ công + webhook + Guest checkout | ✅ Hoàn thành |
| 8 | Frontend Shop (animation) + Frontend Admin | ✅ Hoàn thành |
| 9 | Footer + Category Menu + Tuỳ chỉnh giao diện | ✅ Hoàn thành |
| 10 | Tin tức / Khuyến mãi + Chỉnh sửa KH/NV | ✅ Hoàn thành |

*(Tài liệu này đi kèm toàn bộ code đã triển khai đầy đủ qua các đợt cập nhật.)*
