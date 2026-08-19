# Kế hoạch bổ sung tính năng Electronics Shop

## Context

Người dùng yêu cầu bổ sung nhiều tính năng cho dự án e-commerce electronics shop (Next.js frontend + FastAPI backend). Dưới đây là chi tiết từng feature.

---

## 1. CategoryMenu — Điều chỉnh hiển thị

**File:** [CategoryMenu.tsx](frontend/components/CategoryMenu.tsx)

- Chuyển danh mục sang bên trái thay vì ở giữa
- Có thể hiển thị hết tất cả danh mục

**Thay đổi:**
- Đổi `absolute left-0` → giữ nguyên left nhưng cải thiện layout
- Sửa `justify-between` → `justify-start` để items dồn sang trái
- Thêm `text-left` cho mỗi danh mục

---

## 2. SiteFooter — Phần giới thiệu tuỳ chỉnh bởi admin

**Files:**
- [SiteFooter.tsx](frontend/components/SiteFooter.tsx)
- [settings/page.tsx](frontend/app/admin/(protected)/settings/page.tsx) (thêm field)
- Backend: thêm `footer_intro` vào `site_settings` table và endpoint settings

**Thay đổi:**
- Thêm migration: `ALTER TABLE site_settings ADD COLUMN footer_intro TEXT`
- Backend: cập nhật schema Pydantic `SiteSettingsUpdate`, `SiteSettingsOut`
- Frontend admin settings: thêm textarea "Phần giới thiệu footer"
- SiteFooter: đọc `settings.footer_intro` thay vì hardcoded text từ `BRANDING.description`

---

## 3. Product Detail — Nhiều ảnh + Auto-rotate

**File:** [products/[id]/page.tsx](frontend/app/products/[id]/page.tsx)

**Thay đổi:**
- Thêm state `currentImageIndex`
- Thêm 2 nút mũi tên trái/phải phía dưới ảnh chính
- Thêm auto-rotate: `setInterval` đổi ảnh mỗi 4 giây, dừng khi hover
- Nút mũi tên chỉ hiện khi có ≥ 2 ảnh
- Thumbnail strip bên dưới vẫn giữ nguyên

---

## 4. ProductRow — Carousel với mũi tên

**File:** [ProductRow.tsx](frontend/components/ProductRow.tsx)

**Thay đổi:**
- Thêm state `scrollPosition` hoặc dùng ref + scrollLeft
- Thêm 2 nút mũi tên trái/phải (absolute positioned)
- `overflow-x-auto` thay vì `grid` khi products > 4 items
- Auto-scroll: tự động scroll 1 item mỗi 5 giây nếu có > 4 sản phẩm
- Hiện gradient overlay 2 bên khi có nhiều sản phẩm

---

## 5. Admin Orders — Tính năng mới

**Files:**
- [admin/orders/page.tsx](frontend/app/admin/(protected)/orders/page.tsx)
- Backend endpoints mới: `/admin/orders/{id}/invoice`, `/admin/orders/{id}/send-email`, `/admin/reports/revenue`
- [lib/services/adminOrders.ts](frontend/lib/services/adminOrders.ts)
- [lib/services/reports.ts](frontend/lib/services/reports.ts) (tạo mới)

### 5a. Nút "Hóa đơn"
- Mở modal/dialog hiển thị hóa đơn đầy đủ (mã đơn, khách hàng, sản phẩm, tổng tiền, ngày)
- Có nút "In hóa đơn" (window.print()) hoặc xuất PDF

### 5b. Trang "Tồn kho" (Inventory)
- Tạo route mới `/admin/inventory` → [inventory/page.tsx](frontend/app/admin/(protected)/inventory/page.tsx)
- Backend: endpoint `/admin/inventory` trả danh sách product_units (serial, status, product name)
- Hỗ trợ lọc theo trạng thái: in_stock, sold, reserved, defective
- Admin có thể cập nhật serial/imei

### 5c. Gửi mail đơn hàng cho khách
- Thêm nút "Gửi mail" trong modal chi tiết đơn hàng
- Backend: `POST /admin/orders/{id}/send-email` gửi email đơn hàng
- Dùng SMTP đã cấu hình (từ otp_service.py)

### 5d. Báo cáo doanh thu
- Tạo route mới `/admin/reports` → [reports/page.tsx](frontend/app/admin/(protected)/reports/page.tsx)
- Backend: `GET /admin/reports/revenue?period=monthly|weekly|daily&date=YYYY-MM-DD`
- Trả về: tổng doanh thu, số đơn, top sản phẩm, top khách hàng
- Gửi báo cáo qua mail: `POST /admin/reports/send-email`

---

## 6. OTP qua Email + SMS

**Files:**
- [login/page.tsx](frontend/app/login/page.tsx)
- [register/page.tsx](frontend/app/register/page.tsx) (kiểm tra)
- [backend/app/api/v1/endpoints/auth.py](backend/app/api/v1/endpoints/auth.py)
- [otp_service.py](backend/app/services/otp_service.py)
- [lib/services/auth.ts](frontend/lib/services/auth.ts)

**Thay đổi:**
- Thêm field email vào form login (tùy chọn) — nếu có email thì gửi OTP qua email
- OTP service đã có logic gửi email qua SMTP — chỉ cần kích hoạt bằng cách truyền email từ login step1
- Thêm endpoint gửi lại OTP: `POST /auth/resend-otp`
- Gửi mail đơn hàng: dùng lại `_send_otp_email_sync` hoặc tạo `send_order_email()`

---

## 7. UI — Làm nổi bật Đăng nhập, Giỏ hàng, Liên hệ

**File:** [SiteHeader.tsx](frontend/components/SiteHeader.tsx)

**Thay đổi:**
- Thêm icon badge số lượng trên giỏ hàng (từ cart count)
- Thêm CSS glow/shadow nhẹ cho các nút đăng nhập, giỏ hàng, liên hệ
- Hover effect mạnh hơn (scale, border màu accent)

---

## 8. Giỏ hàng — Hiển thị số lượng sản phẩm

**File:** [SiteHeader.tsx](frontend/components/SiteHeader.tsx)

**Thay đổi:**
- Tạo hook `useCartCount()` đọc từ localStorage (guest) hoặc API (logged in)
- Hiển thị badge số trên icon giỏ hàng
- Cập nhật khi thêm/bớt sản phẩm

---

## 9. Checkout — Làm nổi Hình thức TT và Cổng TT

**File:** [checkout/page.tsx](frontend/app/checkout/page.tsx)

**Thay đổi:**
- Thêm border/dashed nổi bật hơn cho phần "Hình thức thanh toán" và "Cổng thanh toán"
- Dùng card-style với background khác, border accent-color
- Thêm icon + label mô tả rõ hơn cho từng lựa chọn

---

## 10. Swagger UI — Nút Authorize

**File:** [backend/app/main.py](backend/app/main.py)

**Kiểm tra:** File đã có `custom_openapi()` đúng cách — nút Authorize đã được cấu hình. Tuy nhiên cần kiểm tra:
- Swagger UI cần điền `Bearer <token>` vào ô Authorize
- Thêm ghi chú trong description: "Nhấn Authorize → nhập Bearer <access_token>"

---

## 11. Thêm route Inventory và Reports vào Sidebar Admin

**File:** [admin/(protected)/layout.tsx](frontend/app/admin/(protected)/layout.tsx)

**Thay đổi:**
- Thêm nav item: `{ href: "/admin/inventory", label: "Tồn kho", icon: PackageSearch, adminOnly: false }`
- Thêm nav item: `{ href: "/admin/reports", label: "Báo cáo", icon: BarChart3, adminOnly: true }`

---

## Các quyết định đã xác nhận

- **Báo cáo doanh thu:** Tự động gửi email theo lịch (tuần/tháng) + nút gửi thủ công trong admin
- **Hóa đơn:** Xuất file PDF thật (dùng thư viện `jsPDF` phía frontend)
- **OTP đăng nhập:** Gửi qua Email hoặc SMS tuỳ theo thông tin khách cung cấp (nếu có email → gửi email, nếu chỉ có SĐT → log console/dev mode)

## Tóm tắt files cần thay đổi

| File | Feature |
|------|---------|
| `frontend/components/CategoryMenu.tsx` | 1 - Căn trái |
| `frontend/components/SiteFooter.tsx` | 2 - Footer tuỳ chỉnh |
| `frontend/app/products/[id]/page.tsx` | 3 - Ảnh luân phiên |
| `frontend/components/ProductRow.tsx` | 4 - Carousel |
| `frontend/app/admin/(protected)/orders/page.tsx` | 5a,5c - Hóa đơn, gửi mail |
| `frontend/app/admin/(protected)/inventory/page.tsx` | 5b - Tồn kho (tạo mới) |
| `frontend/app/admin/(protected)/reports/page.tsx` | 5d - Báo cáo (tạo mới) |
| `frontend/app/admin/(protected)/settings/page.tsx` | 2 - Thêm footer_intro |
| `frontend/components/SiteHeader.tsx` | 7,8 - Badge giỏ hàng, nổi bật |
| `frontend/app/checkout/page.tsx` | 9 - Làm nổi thanh toán |
| `frontend/app/login/page.tsx` | 6 - Thêm email input |
| `frontend/app/admin/(protected)/layout.tsx` | 11 - Nav items |
| `backend/app/api/v1/endpoints/auth.py` | 6 - Email OTP |
| `backend/app/services/otp_service.py` | 6,5c - Gửi email |
| `backend/app/api/v1/endpoints/inventory.py` | 5b - Inventory endpoints |
| `backend/app/api/v1/endpoints/admin_orders.py` | 5a,5c - Invoice, send email |
| `backend/app/api/v1/router.py` | 5a-5d - Đăng ký routes mới |
| `database/migrations/006_footer_intro.sql` | 2 - Migration mới |
| `frontend/lib/services/adminOrders.ts` | 5a-5d - API calls |
| `frontend/lib/services/reports.ts` | 5d - Reports API (tạo mới) |
| `backend/app/main.py` | 10 - Swagger Authorize (kiểm tra) |

## Verification

- Chạy backend: `cd backend && uvicorn app.main:app --reload`
- Chạy frontend: `cd frontend && npm run dev`
- Test từng feature:
  1. Mở trang chủ → kiểm tra CategoryMenu căn trái
  2. Admin → Settings → thêm footer intro → kiểm tra ở trang chủ
  3. Vào chi tiết sản phẩm có nhiều ảnh → kiểm tra auto-rotate + mũi tên
  4. Trang chủ → ProductRow có mũi tên khi > 4 sản phẩm
  5. Admin → Orders → Hóa đơn, Gửi mail, Tồn kho, Báo cáo
  6. Login → nhập email → nhận OTP qua mail
  7. Header → badge số giỏ hàng
  8. Checkout → phần TT nổi bật
  9. /docs → nút Authorize hiển thị
