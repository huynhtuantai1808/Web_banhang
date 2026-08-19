<<<<<<< HEAD
# Electronics Shop — Hướng dẫn chạy dự án

Xem chi tiết kiến trúc & danh sách tính năng trong `KIEN_TRUC_HE_THONG.md`.

## 1. Cài đặt PostgreSQL & Redis (local hoặc Docker)

```bash
docker run -d --name shop-postgres -e POSTGRES_PASSWORD=your_password -e POSTGRES_DB=electronics_shop -p 5432:5432 postgres:16
docker run -d --name shop-redis -p 6379:6379 redis:7
```

Import schema:
```bash
psql -h localhost -U postgres -d electronics_shop -f database/schema.sql
```

### 1.1. Tạo tài khoản admin và khách hàng mẫu

Sau khi backend đã cài đặt xong (bước 2) và đã import schema, chạy script seed để có ngay
1 tài khoản admin và 1 tài khoản khách hàng dùng thử — chạy lại nhiều lần vẫn an toàn (tự bỏ qua
nếu tài khoản đã tồn tại):

```bash
cd backend
python -m scripts.seed_users
```

Tài khoản được tạo:

| Vai trò | Đăng nhập tại | Tài khoản | Mật khẩu |
|---|---|---|---|
| Admin (nhân viên) | `POST /api/v1/employees/login` | `admin@techtrace.vn` | `Admin@123456` |
| Khách hàng | `POST /api/v1/auth/login` (2 bước, cần OTP) | `0900000002` | `Customer@123456` |

Với tài khoản khách hàng, sau khi gọi `/auth/login` thành công, mã OTP sẽ được in ra console log
của `uvicorn` (môi trường dev chưa gắn nhà cung cấp SMS/Email thật) — copy mã đó gọi tiếp
`/auth/login/verify-otp` để lấy `access_token`.

⚠️ Đây là tài khoản demo, hãy đổi mật khẩu hoặc xoá đi trước khi triển khai thật.

## 2. Backend (FastAPI)

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # điền thông tin kết nối PostgreSQL/Redis thật
uvicorn app.main:app --reload
```
API chạy tại `http://localhost:8000`, Swagger docs tại `http://localhost:8000/docs`.

## 3. Frontend (Next.js)

```bash
cd frontend
npm install
# .env.local đã có sẵn trong source với giá trị mặc định trỏ về BE local.
# Nếu BE chạy ở địa chỉ/port khác, sửa lại NEXT_PUBLIC_API_BASE_URL rồi RESTART npm run dev.
npm run dev
```
Giao diện chạy tại `http://localhost:3000`.
Trang quản trị: `http://localhost:3000/admin/login` → đăng nhập nhân viên → tự chuyển tới `/admin/products`.

### 3.1. Kiến trúc gọi API của Frontend (đã tối ưu lại)

Trước đây mỗi file tự đọc `process.env.NEXT_PUBLIC_API_BASE_URL` và tự viết `fetch(...)` riêng lẻ, dễ
sai địa chỉ hoặc quên gắn token. Giờ toàn bộ đi qua một luồng duy nhất:

```
lib/config.ts        → đọc & chuẩn hoá NEXT_PUBLIC_API_BASE_URL (một nơi duy nhất)
lib/apiClient.ts      → axios instance dùng chung, tự gắn Bearer token, tự chuẩn hoá lỗi
lib/auth-storage.ts   → lưu/đọc token nhân viên (localStorage) tại một nơi duy nhất
lib/media.ts          → dựng URL ảnh đầy đủ từ path tương đối BE trả về
lib/services/*.ts     → 1 file cho mỗi nhóm API: products.ts, employees.ts, auth.ts
```

Các trang (`app/page.tsx`, `app/admin/products/page.tsx`) chỉ import từ `lib/services/*`,
không tự gọi `fetch`/`axios` trực tiếp nữa. Khi cần thêm API mới, thêm hàm vào file service
tương ứng (hoặc tạo file service mới) — không sửa `apiClient.ts`.

### 3.2. Vì sao trước đây FE không gọi được xuống BE — checklist khi gặp lại lỗi này

1. **Thiếu file `.env.local`** (chỉ có `.env.example` sẽ KHÔNG có tác dụng — Next.js không tự đọc
   file `.example`). File `.env.local` đã được tạo sẵn trong source, kiểm tra nó còn tồn tại.
2. **Chưa restart `npm run dev`** sau khi đổi biến môi trường — Next.js chỉ đọc `NEXT_PUBLIC_*` lúc
   khởi động, sửa `.env.local` xong phải tắt/bật lại `npm run dev`.
3. **Backend chưa chạy** hoặc chạy sai port — kiểm tra `http://localhost:8000/health` trả về
   `{"status": "ok"}`.
4. **CORS**: `CORS_ORIGINS` trong `backend/.env` phải chứa đúng origin của FE
   (mặc định `http://localhost:3000`). Nếu đổi port FE, phải cập nhật cả 2 phía.
5. **Sai baseURL**: `NEXT_PUBLIC_API_BASE_URL` phải trỏ tới gốc có `/api/v1`
   (VD: `http://localhost:8000/api/v1`), không phải chỉ `http://localhost:8000`.
6. Khi có lỗi kết nối, `lib/apiClient.ts` sẽ trả về thông báo `ApiError` mô tả rõ nguyên nhân
   (hiển thị ngay trên UI dưới dạng banner đỏ) thay vì lỗi mơ hồ "Failed to fetch".

## 4. Swagger / API Docs

Sau khi chạy backend, truy cập:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

Các API cần đăng nhập (mọi API trừ nhóm `Auth`, `Employees` login và `/health`) đều yêu cầu Bearer token:
1. Nhân viên: gọi `POST /api/v1/employees/login` → lấy `access_token`.
2. Khách hàng: gọi `POST /api/v1/auth/login` → `POST /api/v1/auth/login/verify-otp` → lấy `access_token`.
3. Trên Swagger UI, bấm nút **Authorize** (góc trên bên phải) → nhập `Bearer <access_token>` → giờ có thể gọi thử mọi API ngay trên `/docs`.

## 5. Tính năng nhập dữ liệu / hình ảnh từ client

**a) Nhập hàng loạt sản phẩm từ Excel/CSV** — `POST /api/v1/products/import`
- Nhân viên chọn file `.xlsx`/`.xls`/`.csv` để tạo nhiều sản phẩm cùng lúc (không cần nhập tay từng sản phẩm).
- File mẫu: `database/product_import_template.csv`. Cột bắt buộc: `product_code`, `name`, `price`. Cột tuỳ chọn: `description`, `brand`, `category`, `color`, `material`, `size_dimension`, `discount_price`.
- Hãng (`brand`) và danh mục (`category`) chưa tồn tại sẽ tự động được tạo mới.
- Trả về số dòng thành công và danh sách dòng lỗi kèm lý do (VD: thiếu giá, thiếu tên...).
- Test nhanh trên Swagger: mở `/docs` → `Product Import/Media` → `POST /products/import` → Try it out → chọn file → Execute.

**b) Tải ảnh sản phẩm lên từ client** — `POST /api/v1/products/{product_id}/images`
- Nhận file ảnh (JPEG/PNG/WEBP/GIF, tối đa 5MB) qua `multipart/form-data`.
- Ảnh được lưu tại `backend/uploads/products/<product_id>/` và phục vụ qua `http://localhost:8000/uploads/products/<product_id>/<file>`.
- Có thể đánh dấu ảnh đại diện (`is_primary=true`).
- Frontend: trang `/admin/products` có nút import file và icon upload ảnh trên từng dòng sản phẩm (`lib/api.ts` chứa hàm gọi API tương ứng).

## 7. Cập nhật mới nhất

**a) Tách trang đăng nhập admin khỏi khu vực quản trị**
- `app/admin/login/page.tsx` — trang đăng nhập, KHÔNG có logic kiểm tra token, KHÔNG dùng layout chung.
- `app/admin/products/layout.tsx` — layout riêng chỉ áp dụng cho các trang trong `app/admin/products/*`:
  tự kiểm tra đăng nhập (redirect về `/admin/login` nếu chưa đăng nhập), hiển thị thanh điều hướng +
  nút Đăng xuất. Khi cần thêm trang quản trị khác (VD: `/admin/orders`), tạo trong cùng thư mục
  `app/admin/products/` hoặc tạo layout tương tự cho thư mục mới — không cần lặp lại logic kiểm tra ở
  từng trang.

**b) Nhập sản phẩm mới trực tiếp từ trang quản trị**
- Nút **"Thêm sản phẩm"** giờ mở modal `components/admin/ProductFormModal.tsx` — nhập đủ thông tin
  (mã, tên, mô tả, hãng, danh mục, màu/chất liệu, kích thước, giá, giá khuyến mãi, cho phép trả góp)
  và gọi thẳng `POST /api/v1/products`. Nút bút chì (sửa) trên mỗi dòng dùng chung modal này ở chế độ
  sửa (`PUT /api/v1/products/{id}`).
- **Thay đổi ở Backend**: `ProductCreate`/`ProductOut` giờ nhận **tên hãng/danh mục dạng chữ**
  (`brand`, `category`) thay vì `brand_id`/`category_id` dạng số — hệ thống tự tìm hoặc tạo mới hãng/
  danh mục tương ứng (dùng chung `app/services/catalog_service.py` với tính năng import Excel/CSV).
  Nhờ vậy nhân viên gõ thẳng tên hãng/danh mục, không cần biết ID.
- Thêm `GET /api/v1/brands` và `GET /api/v1/categories` (đọc công khai) để tra cứu danh sách hãng/
  danh mục hiện có.
- `GET /api/v1/products` và `GET /api/v1/products/{id}` giờ là API công khai (không cần đăng nhập) —
  khách chưa đăng nhập vẫn xem được sản phẩm; chỉ các thao tác ghi (POST/PUT/DELETE) mới yêu cầu
  đăng nhập nhân viên.

**c) Đăng ký / đăng nhập cho khách hàng ở trang chủ**
- `components/SiteHeader.tsx` — hiển thị nút **Đăng nhập**/**Đăng ký** ở góc phải trang chủ (hoặc nút
  Đăng xuất nếu đã đăng nhập).
- `app/register/page.tsx` — form đăng ký khách hàng, gọi `POST /api/v1/auth/register` (BE đã có sẵn).
- `app/login/page.tsx` — đăng nhập khách hàng 2 bước (mật khẩu → OTP), gọi
  `POST /api/v1/auth/login` rồi `POST /api/v1/auth/login/verify-otp` (BE đã có sẵn, không cần bổ
  sung). Token khách hàng lưu riêng biệt với token nhân viên qua `lib/auth-storage.ts`
  (`customer_token` vs `employee_token`).
- Đã build thử `npm run build` + `tsc --noEmit` — thành công, không lỗi.

## 9. Cập nhật mới nhất (đợt 2)

**a) Sửa lỗi crash "NotFoundError: insertBefore" khi lọc danh mục**
- Nguyên nhân: `FilterTabs.tsx` (bản cũ) dùng `motion.span layoutId` để tạo hiệu ứng pill trượt
  giữa các nút — khi nút active đổi nhanh mà không có `<AnimatePresence>` bao ngoài, Framer Motion
  thao tác DOM trực tiếp (kỹ thuật FLIP) và xung đột với React reconciler.
- Đã viết lại hoàn toàn `components/FilterTabs.tsx`: bỏ `layoutId`/motion cho phần tô nền, chỉ dùng
  CSS transition thuần (`transition-colors`) — hết crash, hiệu ứng vẫn mượt.

**b) Sửa lỗi ảnh không hiển thị ở trang khách hàng sau khi upload ở admin**
- Nguyên nhân: Backend chưa từng trả `primary_image_url` trong response `GET /products`.
- Đã thêm `outerjoin` với `ProductImage` (lọc `is_primary = True`) vào `products.py`, thêm field
  `primary_image_url` vào `ProductOut`. Frontend (`app/page.tsx`, `app/products/[id]/page.tsx`)
  dùng đúng field này để hiển thị ảnh.

**c) Filter theo danh mục — hãng — giá — chức năng (kết hợp nhiều điều kiện)**
- `FilterTabs` giờ là **controlled component**: state lưu ở `app/page.tsx`, mỗi lần đổi lựa chọn sẽ
  gọi lại `GET /products` với toàn bộ điều kiện đang chọn (kết hợp kiểu AND).
- Backend `GET /products` thêm param `feature` (tìm trong tên + mô tả sản phẩm), giữ nguyên
  `brand`, `category`, `min_price`, `max_price`.
- VD luồng: gõ "điện thoại" ở thanh tìm kiếm → chọn hãng "Samsung" → chọn giá "< 10tr" → chọn chức
  năng "Gaming" → danh sách tự động lọc theo tất cả điều kiện.

**d) Phân quyền nhân viên: Quản lý (full quyền) vs Nhân viên (quyền tuỳ chỉnh)**
- Thêm cột `permissions` (JSONB: `can_create`, `can_edit`, `can_delete`) vào bảng `employees`
  — xem `database/migrations/002_add_employee_permissions.sql` nếu DB đã tạo từ trước.
- Backend: `require_admin` (chỉ vai trò "admin"/Quản lý), `require_permission(key)` (kiểm tra quyền
  chi tiết cho vai trò "staff"/Nhân viên — admin luôn được bỏ qua kiểm tra này). JWT nhúng
  `employee_role` + `permissions` ngay lúc đăng nhập.
- Các endpoint tạo/sửa/xoá sản phẩm, upload ảnh, import Excel/CSV giờ dùng `require_permission`
  thay vì `require_employee` chung chung — Nhân viên chỉ làm được thao tác đã được Quản lý cấp quyền.
- **Lưu ý**: quyền được nhúng vào JWT tại thời điểm đăng nhập; nếu Quản lý vừa đổi quyền của một
  nhân viên đang đăng nhập, nhân viên đó cần đăng nhập lại để quyền mới có hiệu lực.

**e) Trang "Add User" + phân quyền cho nhân viên ở khu vực quản trị**
- Tái cấu trúc route admin thành route group `app/admin/(protected)/` — layout dùng chung
  (kiểm tra đăng nhập, thanh điều hướng, nút Đăng xuất) cho mọi trang trong group, `admin/login`
  nằm hoàn toàn ngoài group này.
- `app/admin/(protected)/users/page.tsx` (mới, chỉ Quản lý xem được) — danh sách nhân viên +
  modal `components/admin/UserFormModal.tsx`: thanh chọn vai trò **Quản lý** (full quyền) /
  **Nhân viên** (hiện thêm 3 checkbox: Thêm sản phẩm, Sửa sản phẩm, Xoá sản phẩm) — đúng tính
  năng "thanh click chọn quyền" được yêu cầu. Cùng modal này dùng để **sửa** nhân viên đã tạo.
- `GET/POST/PUT/DELETE /api/v1/employees` (ngoại trừ `/login`) — toàn bộ yêu cầu quyền admin.

**f) Logo/thương hiệu tuỳ chỉnh dễ dàng**
- `lib/branding.ts` — nơi DUY NHẤT khai báo tên shop, tagline, mô tả, icon logo.
- `components/Logo.tsx` — đọc từ `branding.ts`; hỗ trợ 5 icon có sẵn (đổi `iconName`) hoặc dùng ảnh
  logo riêng (đặt file vào `frontend/public/`, set `logoImageSrc: "/logo.png"`).
- `SiteHeader`, layout admin, `<title>` trang đều dùng chung `Logo`/`BRANDING` — đổi 1 chỗ, cập nhật
  toàn bộ giao diện.

**g) Giỏ hàng + trang chi tiết sản phẩm hoạt động thật**
- Backend (mới): `GET/POST/PUT/DELETE /api/v1/cart`, `/cart/items/{id}` — yêu cầu đăng nhập khách
  hàng (`require_customer`). Response trả kèm tên/giá/ảnh sản phẩm để FE không cần gọi thêm API.
- `ProductCard` giờ bọc trong `<Link href="/products/{id}">` để click xem chi tiết; nút "Thêm vào
  giỏ" gọi thẳng `POST /cart/items` — nếu khách chưa đăng nhập sẽ tự điều hướng sang `/login`.
- `app/products/[id]/page.tsx` (mới) — trang chi tiết: gallery ảnh, mô tả, cấu hình, giá, nút thêm
  giỏ hàng.
- `app/cart/page.tsx` (mới) — xem giỏ hàng, tăng/giảm số lượng, xoá sản phẩm, tổng tiền. (Nút
  "Tiến hành thanh toán" hiện chưa nối API — cần module Order/Checkout ở đợt tiếp theo.)
- `apiClient.ts` cập nhật: tự gắn đúng loại token theo route (`/cart/*` → token khách hàng,
  còn lại → token nhân viên).

Đã build thử `npm run build` (FE, toàn bộ route mới lên đúng: `/admin/users`, `/cart`,
`/products/[id]`...) và import `app.main` (BE, 31 routes) — không lỗi.

## 11. Cập nhật mới nhất (đợt 3) — Thanh toán & Tuỳ chỉnh giao diện

**a) Thanh toán + Cổng thanh toán VNPay**
- Backend: `Order` giờ có `payment_gateway` (`cod`|`vnpay`), `payment_status` (`pending`|`paid`|`failed`),
  `gateway_transaction_id`. Xem `database/migrations/003_payments_and_site_settings.sql` nếu DB đã tạo
  từ trước.
- `app/services/vnpay_service.py` — tự dựng URL thanh toán (ký HMAC-SHA512 theo đúng chuẩn VNPay) và
  xác thực chữ ký khi VNPay redirect khách hàng quay lại. Cấu hình qua `.env`:
  `VNP_TMN_CODE`, `VNP_HASH_SECRET` (đăng ký merchant sandbox miễn phí tại
  https://sandbox.vnpayment.vn), `VNP_PAY_URL`, `VNP_RETURN_URL`, `FRONTEND_URL`.
  **Để trống `VNP_TMN_CODE`/`VNP_HASH_SECRET` thì hệ thống chỉ cho phép thanh toán COD** — API tạo
  đơn sẽ báo lỗi rõ ràng nếu khách chọn "vnpay" mà chưa cấu hình.
- Luồng: `POST /api/v1/orders` (tạo đơn từ giỏ hàng, chọn `cod` hoặc `vnpay`) → nếu `vnpay`, response
  kèm `payment_url` để FE `window.location.href` sang VNPay → khách thanh toán xong, VNPay tự redirect
  về `GET /api/v1/payments/vnpay/return` → BE xác thực chữ ký + cập nhật đơn → redirect tiếp về FE
  tại `/orders/result?payment=...`.
- Frontend: `app/checkout/page.tsx` (chọn địa chỉ + COD/VNPay) → `app/orders/result/page.tsx` (trang
  kết quả) → `app/orders/page.tsx` (tra cứu đơn hàng đã đặt). Nút "Tiến hành thanh toán" ở `/cart`
  giờ dẫn thẳng vào luồng này.
- **Lưu ý bảo mật**: đã test roundtrip ký/xác thực chữ ký VNPay — giả mạo bất kỳ tham số nào (số
  tiền, mã đơn...) đều khiến `verify_return_params` trả về `False`, chặn được yêu cầu giả mạo kết
  quả thanh toán.

**b) Admin tuỳ chỉnh giao diện trang khách hàng (storefront)**
- Backend: bảng `site_settings` (dạng singleton, luôn 1 dòng `id=1`) lưu tên shop, tiêu đề/mô tả
  banner, ảnh banner, logo, màu chủ đạo (`accent_color`, mã HEX).
  `GET /api/v1/settings` công khai (storefront gọi lúc tải trang chủ); `PUT /api/v1/settings`,
  `POST /api/v1/settings/banner-image`, `POST /api/v1/settings/logo-image` chỉ Quản lý (admin).
- Frontend: `app/admin/(protected)/settings/page.tsx` (mục **"Giao diện"** trong nav admin, cạnh
  Sản phẩm/Nhân viên) — form sửa tên shop, nhãn nhỏ + tiêu đề + mô tả banner, color picker chọn màu
  chủ đạo, upload ảnh banner/logo.
- `components/SiteSettingsProvider.tsx` — Context bọc toàn bộ app (`app/layout.tsx`), tự gọi
  `GET /settings` lúc tải trang và áp `accent_color` vào CSS variable `--accent-color` /
  `--accent-color-light` (tự tính màu sáng hơn để dùng cho hover) ngay trên `document.documentElement`.
- Trang chủ (`app/page.tsx`), `SiteHeader`, `Logo`, `ProductCard` đều đọc từ context này thay vì
  giá trị tĩnh — đổi 1 chỗ trong `/admin/settings`, cả trang chủ + màu điểm nhấn toàn giao diện đổi
  theo ngay khi tải lại trang (không cần build lại code).
- `lib/branding.ts` vẫn giữ vai trò **giá trị mặc định/fallback** — dùng khi chưa cấu hình gì trong
  DB hoặc lúc gọi API settings thất bại, tránh trang trắng/lỗi.

Đã build thử `npm run build` (FE, 14 routes, tất cả route mới lên đúng: `/checkout`, `/orders`,
`/orders/result`, `/admin/settings`...) và import `app.main` (BE, 39 routes) — không lỗi. Đã test
riêng logic ký/xác thực VNPay bằng script độc lập — hoạt động đúng cả trường hợp hợp lệ và giả mạo.

## 13. Cập nhật mới nhất (đợt 4) — IPN VNPay & Trang chi tiết đơn hàng

**a) IPN (Instant Payment Notification) — kênh xác nhận thanh toán đáng tin cậy hơn Return URL**
- Vấn đề với chỉ dùng Return URL: nó chạy qua trình duyệt của khách hàng — nếu khách đóng tab,
  mất mạng, hoặc trình duyệt chặn redirect ngay sau khi thanh toán xong (trước khi kịp quay về BE),
  đơn hàng có thể mãi ở trạng thái `pending` dù tiền đã trừ thành công bên VNPay.
- `GET /api/v1/payments/vnpay/ipn` (mới) — VNPay gọi thẳng từ **server của VNPay** tới BE, độc lập
  hoàn toàn với trình duyệt khách hàng. Đây là kênh chính thức, đáng tin cậy để xác nhận thanh toán
  trong production.
- Cấu hình: vào cổng merchant VNPay (sandbox hoặc thật) → mục **IPN URL** → khai báo
  `<domain BE của bạn>/api/v1/payments/vnpay/ipn` (cần domain public, không dùng được `localhost`
  vì đây là lệnh gọi server-to-server).
- Tuân thủ đúng hợp đồng response mà VNPay yêu cầu (bắt buộc trả JSON `{"RspCode": ..., "Message": ...}`):
  - `00` — xác nhận thành công
  - `01` — không tìm thấy đơn hàng
  - `02` — đơn đã được xác nhận trước đó (**idempotent** — VNPay có thể gọi IPN nhiều lần cho cùng
    1 giao dịch, BE phải nhận biết và không xử lý lại, tránh cộng dồn hoặc ghi đè sai)
  - `04` — số tiền không khớp (chống giả mạo số tiền)
  - `97` — chữ ký không hợp lệ (chống giả mạo toàn bộ request)
- Cả `/vnpay/return` và `/vnpay/ipn` giờ dùng chung logic cốt lõi (`_apply_payment_outcome`,
  `_expected_amount_x100`, `_find_order`) — sửa 1 chỗ, áp dụng cho cả 2 kênh; đồng thời `/return`
  cũng được bổ sung kiểm tra số tiền + idempotency giống `/ipn` (trước đó `/return` chưa kiểm tra
  số tiền, giờ đã đồng bộ).
- Đã test riêng bằng script độc lập (không cần DB thật): xác thực chữ ký hợp lệ, số tiền khớp,
  cập nhật đúng trạng thái, phát hiện đúng khi đơn đã thanh toán trước đó (không xử lý lại), phát
  hiện đúng giả mạo số tiền, phát hiện đúng giả mạo chữ ký — **tất cả pass**.

**b) Trang chi tiết đơn hàng** — `app/orders/[id]/page.tsx`
- Thanh tiến trình trực quan theo trạng thái đơn: Chờ xác nhận → Đã xác nhận → Đang giao → Hoàn thành
  (hiển thị riêng nếu đơn đã bị huỷ).
- Thông tin thanh toán (COD/VNPay, trạng thái) + địa chỉ giao hàng.
- Danh sách sản phẩm, tạm tính, giảm giá (nếu có), tổng cộng.
- Trang danh sách `/orders` giờ mỗi đơn hàng là 1 `Link` dẫn vào trang chi tiết này (trước đó hiển
  thị đầy đủ thông tin ngay trong danh sách, giờ tách gọn — danh sách chỉ hiện tóm tắt, bấm vào để
  xem đầy đủ).

Đã build thử `npm run build` (FE, 14 routes tĩnh/động, bao gồm `/orders/[id]` mới) và import
`app.main` (BE, 40 routes) — không lỗi.

## 15. Cập nhật mới nhất (đợt 5) — Khuyến mãi, Trả góp, Quản lý khách hàng, OTP Email thật

Các bảng `promotions`, `promotion_customer`, `discount_rules`, `installment_plans`,
`installment_payments` đã có sẵn trong `database/schema.sql` từ bản scaffold đầu tiên nhưng chưa
từng có API/logic nghiệp vụ đi kèm — đợt này hoàn thiện toàn bộ phần còn thiếu đó, **không cần
migration DB mới**.

**a) Khuyến mãi / Chiết khấu**
- `app/services/promotion_service.py` — logic lõi: mã **công khai** (ai cũng dùng được, không có
  dòng nào trong `promotion_customer`) vs mã **phân bổ riêng** (chỉ khách hàng có dòng
  `promotion_customer` tương ứng, chưa dùng, mới áp dụng được). Tự kiểm tra ngày hiệu lực, giới hạn
  lượt dùng, không cho giảm vượt quá tổng giá trị đơn.
- `endpoints/promotions.py` — CRUD mã khuyến mãi (admin), phân bổ mã cho khách hàng cụ thể theo SĐT
  (`POST /promotions/{id}/assign`), khách hàng xem mã khả dụng (`GET /promotions/mine`) và kiểm tra
  mã trước khi đặt hàng (`POST /promotions/validate` — chỉ xem trước, không đánh dấu đã dùng).
- `POST /orders` giờ nhận thêm `promo_code` — **luôn tính lại discount ở Backend**, không tin số
  liệu giảm giá từ Frontend, tránh khách sửa request để tự ý giảm giá.
- Frontend: `app/admin/(protected)/promotions/page.tsx` (tạo/sửa/ngừng/phân bổ mã) +ở trang
  `/checkout` có ô nhập mã + gợi ý các mã khách hàng đang có sẵn (dạng chip bấm nhanh).
- Đã test bằng script độc lập (SQLite in-memory): mã công khai dùng được bởi bất kỳ ai ✓, mã riêng
  chỉ khách được phân bổ mới dùng được ✓, khách khác bị từ chối đúng cách ✓, dùng lại mã đã dùng bị
  chặn ✓ — **tất cả pass**.

**b) Trả góp (Installment) — mặc định 0% lãi suất**
- `app/services/installment_service.py` — tạo `InstallmentPlan` + toàn bộ lịch `InstallmentPayment`
  theo từng kỳ (3/6/9/12 tháng), kỳ cuối tự gánh phần dư làm tròn để tổng các kỳ luôn khớp chính xác
  100% với số tiền cần trả góp.
- `POST /orders` nhận thêm `payment_method` (`full`/`installment`) + `installment_months`. Nếu
  `installment`: bắt buộc TẤT CẢ sản phẩm trong giỏ có `is_installment_eligible=true` (chặn ở BE,
  không chỉ ở FE), và luôn ép `payment_gateway="cod"` (trả góp trong hệ thống này thu kỳ đầu qua
  COD, không hỗ trợ qua VNPay).
- `GET /installment-calculator` (công khai) — máy tính nhanh, dùng ở trang chi tiết sản phẩm để
  hiển thị "Trả góp chỉ từ ...đ/tháng" ngay cả khi khách chưa đăng nhập.
- `GET /orders/{id}/installment` — xem lịch trả góp đầy đủ của 1 đơn hàng (chủ đơn).
- Frontend: `/checkout` có lựa chọn Trả toàn bộ / Trả góp + chọn kỳ hạn + xem trước số tiền mỗi
  tháng ngay khi chọn; `/products/[id]` hiển thị giá trả góp ước tính (12 tháng); `/orders/[id]`
  hiển thị đầy đủ lịch trả góp từng kỳ kèm trạng thái.
- Đã test: 12.000.000đ / 12 tháng / 0% lãi = đúng 1.000.000đ/tháng ✓; tạo kế hoạch 10.000.000đ / 3
  kỳ, tổng 3 kỳ cộng lại khớp chính xác 10.000.000đ (không lệch do làm tròn) ✓.

**c) Trang quản lý khách hàng cho admin**
- `endpoints/customers.py` — `GET /customers` (danh sách + tìm theo tên/SĐT), `GET /customers/{id}`
  (chi tiết kèm tổng số đơn đã thanh toán + tổng chi tiêu), `PUT /customers/{id}` (sửa thông tin,
  khoá/mở khoá tài khoản) — toàn bộ chỉ Quản lý (admin).
- Frontend: `app/admin/(protected)/customers/page.tsx` — bảng danh sách, bấm vào 1 dòng xem chi
  tiết (modal), nút khoá/mở khoá nhanh ngay trên bảng.

**d) OTP qua Email thật (SMTP)**
- `app/services/otp_service.py` — nếu khách hàng có email VÀ Backend đã cấu hình
  `EMAIL_SMTP_HOST`/`EMAIL_SMTP_USER`/`EMAIL_SMTP_PASSWORD` trong `.env`: gửi **email thật** chứa mã
  OTP qua SMTP (chạy trong thread riêng qua `asyncio.to_thread`, không chặn event loop của FastAPI).
  Nếu gửi lỗi hoặc chưa cấu hình: tự động fallback in ra console (giữ nguyên hành vi dev cũ, không
  làm gián đoạn luồng đăng nhập).
- **Gửi SMS thật chưa có sẵn** — cần tài khoản trả phí ở một nhà cung cấp cụ thể (Twilio, ESMS,
  Speedsms...); điểm tích hợp đã tách rõ ràng trong `send_otp_via_sms_or_email()`, chỉ cần thêm
  nhánh gọi API nhà cung cấp bạn chọn.
- Ví dụ cấu hình với Gmail (dùng App Password, không dùng mật khẩu Gmail thường):
  `EMAIL_SMTP_HOST=smtp.gmail.com`, `EMAIL_SMTP_PORT=587`, `EMAIL_SMTP_USER=<email>@gmail.com`,
  `EMAIL_SMTP_PASSWORD=<app_password>`.

Đã build thử `npm run build` (FE, 16 routes) và import `app.main` (BE, 52 routes) — không lỗi.

## 17. Cập nhật mới nhất (đợt 6) — Quản lý đơn hàng, Vận chuyển, Phân loại, Chatbot & Liên hệ

**a) Quản lý đơn hàng cho admin**
- `endpoints/admin_orders.py` — `GET /admin/orders` (toàn bộ đơn của mọi khách hàng, lọc theo
  trạng thái/thanh toán, tìm theo mã đơn/tên/SĐT), `GET /admin/orders/{id}`, `PUT /admin/orders/{id}/status`
  (cập nhật trạng thái thủ công — yêu cầu quyền `can_edit`). Mọi nhân viên đã đăng nhập đều xem
  được danh sách (để hỗ trợ khách), chỉ thao tác ghi mới cần quyền riêng.
- Frontend: `app/admin/(protected)/orders/page.tsx` (mục **"Đơn hàng"** đầu tiên trong nav admin) —
  bảng danh sách + bộ lọc, bấm vào 1 đơn để xem chi tiết, đổi trạng thái, và gán/cập nhật vận
  chuyển ngay trong cùng 1 modal.

**b) Liên kết đơn vị vận chuyển**
- Bảng mới `shipments` + `shipment_status_logs` (lịch sử trạng thái dạng timeline).
- **Chế độ hoạt động chính: thủ công** — nhân viên chọn đơn vị vận chuyển (Giao Hàng Nhanh, Viettel
  Post, Ninja Van...), nhập mã vận đơn, sau đó cập nhật trạng thái (Chờ lấy hàng → Đã lấy hàng →
  Đang vận chuyển → Đã giao/Thất bại/Hoàn trả) theo thông tin nhận được từ hãng vận chuyển qua điện
  thoại/cổng đối tác của họ. **Hoạt động đầy đủ ngay, không cần tài khoản API của bất kỳ hãng nào.**
- Mỗi lần đổi trạng thái vận chuyển **tự động đồng bộ** trạng thái đơn hàng tương ứng
  (`picked_up`/`in_transit` → đơn "Đang giao"; `delivered` → đơn "Hoàn thành" + tự đánh dấu đã
  thanh toán nếu là đơn COD; `failed`/`returned` → đơn "Đã huỷ") — xem `services/shipping_service.py`.
- `POST /api/v1/webhooks/carrier` (mới, public nhưng bảo vệ bằng header `X-Webhook-Secret` khớp
  `CARRIER_WEBHOOK_SECRET` trong `.env`) — điểm tích hợp cho **tự động hoá thật** sau này: nếu đơn
  vị vận chuyển (hoặc Zapier/Make làm trung gian) hỗ trợ gọi webhook khi trạng thái thay đổi, trỏ
  URL này vào là hệ thống tự cập nhật, không cần nhân viên nhập tay.
- Khách hàng xem tình trạng giao hàng dạng timeline ngay trong trang chi tiết đơn hàng (`/orders/[id]`).
- **Về tích hợp API thật (VD: Giao Hàng Nhanh - GHN)**: đã viết sẵn ghi chú chi tiết từng bước ở
  cuối `shipping_service.py` (lấy Token/ShopId, endpoint tạo đơn, cấu hình webhook...) nhưng **chưa
  test được với tài khoản GHN thật** (không có tài khoản để test) — cần bạn tự đăng ký và xác minh
  khi triển khai. Toàn bộ phần còn lại (đồng bộ trạng thái, hiển thị cho khách, quản lý ở admin)
  đã hoạt động và test đầy đủ, không phụ thuộc vào bước tích hợp API thật này.

**c) Tab "Phân loại" — thêm/sửa danh mục và hãng**
- `endpoints/catalog.py` mở rộng: `POST/PUT/DELETE /brands`, `POST/PUT/DELETE /categories` (yêu
  cầu quyền `can_create`/`can_edit`/`can_delete` tương ứng). Xoá bị chặn với thông báo rõ ràng nếu
  vẫn còn sản phẩm/danh mục con thuộc về nó (bắt lỗi `IntegrityError` từ ràng buộc khoá ngoại).
- Frontend: `app/admin/(protected)/categories/page.tsx` (mục **"Phân loại"** trong nav) — 2 bảng
  song song (Hãng / Danh mục), thêm mới, sửa inline, xoá ngay trên danh sách.

**d) Chatbot tư vấn tự động + trang liên kết hotline**
- `components/ChatWidget.tsx` — widget chat nổi góc màn hình (mọi trang khách hàng, tự ẩn ở khu
  vực `/admin`). Hoạt động theo kiểu **rule-based FAQ** (đối sánh từ khoá tiếng Việt không dấu,
  xem `lib/chatbotData.ts`) — **không gọi AI/LLM nào**, trả lời tức thì các câu hỏi thường gặp
  (giao hàng, đổi trả, trả góp, bảo hành, khuyến mãi, thanh toán). Có nút gợi ý nhanh + link gọi
  hotline/Facebook ngay trong khung chat.
  → Muốn nâng cấp thành chatbot AI thật (hiểu ngôn ngữ tự nhiên), thay hàm `findBestReply()` bằng
  một lệnh gọi API tới dịch vụ AI bạn chọn — đã ghi chú ngay trong file.
- `app/contact/page.tsx` (mới) — trang liên kết Hotline/Zalo/Facebook, mỗi kênh 1 thẻ bấm được.
- `lib/branding.ts` bổ sung mục `contact` (hotlinePhone, zaloLink, facebookLink, workingHours) —
  **đổi thông tin liên hệ chỉ tại 1 chỗ này**, áp dụng cho cả ChatWidget và trang `/contact`.
- `SiteHeader` thêm icon "Liên hệ" dẫn tới `/contact`.

Đã build thử `npm run build` (FE, 19 routes, bao gồm `/admin/orders`, `/admin/categories`,
`/contact`) và import `app.main` (BE, 67 routes) — không lỗi. Đã test độc lập logic đồng bộ
shipment↔order (picked_up/in_transit → shipping, delivered → completed + tự paid nếu COD, trạng
thái không hợp lệ bị từ chối, lịch sử ghi log đầy đủ) — tất cả pass.

## 19. Cập nhật mới nhất (đợt 7) — Dọn TODO cũ + Chiết khấu tự động + Thu tiền trả góp

**a) Dọn comment TODO lỗi thời trong `router.py`**
- Comment TODO liệt kê `customers, employees, cart, orders, installment, promotions` là còn sót
  lại từ **bản nháp đầu tiên** (Turn 1) — thực ra tất cả các router này đã được triển khai đầy đủ
  và đăng ký từ các đợt cập nhật trước, chỉ là comment chưa được xoá. Đã xác nhận lại bằng cách
  liệt kê toàn bộ file trong `app/api/v1/endpoints/` (15 file) và grep các route đã đăng ký — khớp
  100%, không thiếu router nào trong danh sách đó.
- `categories` và `search` trong TODO cũ **không cần router riêng** vì đã được phủ đầy đủ:
  quản lý danh mục/hãng nằm trong `catalog.router` (đã có từ trước), tìm kiếm sản phẩm nằm trong
  `products.router` (`GET /products` hỗ trợ keyword/brand/category/feature/giá, kết hợp AND).

**b) Chiết khấu tự động theo hãng/danh mục/số lượng (`discount_rules`)**
- Đây là bảng đã tồn tại từ bản scaffold đầu tiên nhưng chưa có API/logic — nay đã hoàn thiện.
  **Khác với Promotions** (khách phải chủ động nhập mã), `discount_rules` áp dụng TỰ ĐỘNG ngay khi
  giỏ hàng đủ điều kiện, không cần thao tác gì từ khách.
- `services/discount_rule_service.py` — với mỗi sản phẩm trong giỏ, tìm quy tắc khớp hãng và/hoặc
  danh mục (bỏ qua điều kiện nào không khai báo) + đủ số lượng tối thiểu; nếu nhiều quy tắc cùng
  khớp, lấy quy tắc có % giảm cao nhất.
- `POST/PUT/DELETE /discount-rules` (admin, theo quyền can_create/can_edit/can_delete).
- **Thứ tự tính toán khi tạo đơn** (`POST /orders`): trừ chiết khấu tự động trước → mã khuyến mãi
  (nếu có) tính trên phần còn lại → `discount_amount` cuối cùng = tổng cả hai. `POST
  /promotions/validate` (xem trước ở checkout) cũng tính theo ĐÚNG thứ tự này để số hiển thị khớp
  chính xác với số thực áp dụng lúc đặt hàng — tránh trường hợp trang xem trước và lúc đặt hàng
  lệch nhau.
- Frontend: mục "Chiết khấu tự động" ngay dưới bảng Khuyến mãi (`/admin/promotions`) — tạo/sửa/xoá
  quy tắc; trang `/checkout` tự hiển thị dòng "Chiết khấu tự động" trong tóm tắt đơn hàng nếu có,
  cộng dồn với mã khuyến mãi (nếu khách nhập thêm).
- Đã test độc lập (SQLite in-memory, dùng fake Product object để tránh xung đột kiểu JSONB của
  Postgres): mua chưa đủ số lượng → không giảm ✓; mua đủ số lượng đúng hãng → giảm đúng % ✓; sản
  phẩm khác hãng không khớp rule → không giảm dù mua nhiều ✓; giỏ hàng trộn nhiều loại → chỉ sản
  phẩm khớp rule được giảm ✓ — tất cả pass.

**c) Đánh dấu đã thu tiền từng kỳ trả góp**
- `PUT /admin/installment-payments/{id}/mark-paid` (quyền `can_edit`) — đánh dấu 1 kỳ cụ thể đã
  thu tiền; nếu đây là kỳ cuối cùng của kế hoạch, tự động chuyển `InstallmentPlan.status` sang
  `completed`.
- `GET /admin/installment-plans` — toàn bộ kế hoạch trả góp kèm thông tin khách hàng + đơn hàng,
  để nhân viên theo dõi kỳ nào sắp tới hạn/đã quá hạn.
- Frontend: `app/admin/(protected)/installments/page.tsx` (mục **"Trả góp"** trong nav) — mỗi đơn
  trả góp hiển thị đầy đủ lịch từng kỳ, cảnh báo (⚠) nếu kỳ đã quá hạn mà chưa thu, nút "Đánh dấu
  đã thu" ngay trên từng dòng.
- **Sửa 1 lỗi phát hiện khi làm phần này**: schema `InstallmentPaymentOut` trước đó thiếu trường
  `id` (chỉ có period_no/due_date/amount/status) nên Frontend không có cách nào tham chiếu đúng kỳ
  cần đánh dấu — đã bổ sung `id` vào schema và endpoint trả về.

Đã build thử `npm run build` (FE, 20 routes) và import `app.main` (BE, 74 routes) — không lỗi.

## 21. Cập nhật mới nhất (đợt 8) — Footer, Menu danh mục, Guest Checkout, Tối ưu Admin

**a) Footer hiển thị thông tin cửa hàng**
- `components/SiteFooter.tsx` — logo, mô tả shop, liên hệ (hotline/Zalo/Facebook/giờ mở cửa), link
  hỗ trợ nhanh (Liên hệ, Tra cứu đơn hàng, Giỏ hàng, Đăng nhập). Đã thêm vào toàn bộ trang khách
  hàng: trang chủ, chi tiết sản phẩm, danh mục, giỏ hàng, checkout, đơn hàng, liên hệ.

**b) Menu danh mục dạng ☰ + giữ nguyên FilterTabs ở sidebar**
- `components/CategoryMenu.tsx` — nút ☰ mở mega-menu 2 cột: cột trái danh mục cha (Laptop, Điện
  thoại, Máy tính bảng, PC Gaming, Camera...), di chuột vào 1 danh mục cha hiện cột phải danh mục
  con tương ứng. Bấm vào 1 mục điều hướng sang `/category/[slug]`.
- **Tách biệt rõ với `<FilterTabs>`**: CategoryMenu là điều hướng theo cây danh mục (chuyển trang),
  FilterTabs vẫn là lọc tại chỗ (hãng/giá/chức năng) trên cùng 1 trang — không thay đổi hành vi cũ.
- `app/category/[slug]/page.tsx` (mới) — trang danh mục với breadcrumb kiểu "Laptop `>` Laptop
  Gaming", banner riêng (nếu admin đã tải lên), giữ nguyên FilterTabs sidebar để lọc thêm trong
  danh mục đó. Backend `GET /products?category_id=X` tự động gồm cả sản phẩm của danh mục con.

**c) Đặt hàng không cần đăng ký tài khoản (Guest Checkout)**
- Backend: `POST /orders/guest` (public) — khách gửi kèm họ tên/SĐT/địa chỉ + danh sách sản phẩm
  ngay trong request (vì không có giỏ hàng lưu server). Hệ thống tự tạo (hoặc tái sử dụng nếu SĐT
  đã từng mua) một hồ sơ khách hàng ở chế độ `is_verified=False` để **lưu lại thông tin đơn hàng**.
  `GET /orders/lookup?order_code=X&phone=Y` (public) — tra cứu lại đơn hàng sau này, chỉ cần đúng
  cả mã đơn và SĐT (không cần mật khẩu, không cần đăng nhập).
  **Giới hạn**: khách vãng lai không dùng được trả góp (cần tài khoản xác thực để theo dõi nhiều kỳ).
  Logic tính giá/khuyến mãi/chiết khấu tự động dùng CHUNG 1 hàm lõi (`_create_order_core`) với luồng
  khách đã đăng nhập — đảm bảo 2 luồng không bị lệch nhau.
- Frontend: `lib/guestCart.ts` — giỏ hàng khách vãng lai lưu ở `localStorage`. `ProductCard`/trang
  chủ/trang danh mục giờ thêm được vào giỏ dù chưa đăng nhập. `/cart` hiển thị đúng cả 2 loại giỏ
  hàng (server nếu đã đăng nhập, localStorage nếu chưa). `/checkout` hiện thêm form họ tên/SĐT/email
  khi chưa đăng nhập, ẩn tuỳ chọn trả góp, gọi `POST /orders/guest` khi xác nhận. `/orders/lookup`
  (mới) — trang tra cứu đơn hàng cho khách vãng lai.
- Đã test độc lập (SQLite in-memory): tạo khách hàng mới từ thông tin guest ✓, tính đúng tổng tiền
  từ danh sách sản phẩm trực tiếp (không qua giỏ hàng DB) ✓, tìm lại đúng khách cũ theo SĐT khi họ
  quay lại đặt hàng lần 2 (không tạo trùng) ✓ — tất cả pass.
- **Phát hiện & sửa 1 lỗi thật trong quá trình test**: `passlib[bcrypt]` không ghim version `bcrypt`
  nên tự động cài `bcrypt==5.0.0`, phiên bản này đã xoá thuộc tính nội bộ mà `passlib` dùng để phát
  hiện version, gây lỗi `hash_password()`/`verify_password()` — ảnh hưởng TOÀN BỘ luồng đăng ký/đăng
  nhập, không riêng gì guest checkout. Đã ghim `bcrypt==4.0.1` trong `requirements.txt` và xác nhận
  lại hash/verify hoạt động đúng.

**d) Tối ưu quản lý Phân loại ở admin**
- Danh mục giờ hỗ trợ đầy đủ **cấu trúc cha/con** ngay trên UI: chọn danh mục cha khi tạo/sửa, hiển
  thị dạng cây thụt lề (`└─`) thay vì danh sách phẳng như trước.
- Mỗi danh mục có thể **tải ảnh banner riêng** (icon 🖼 cạnh tên) — ảnh này hiển thị khi khách click
  vào trang danh mục đó (`/category/[slug]`), khác với banner trang chủ.
- Backend: `POST/PUT /categories` validate danh mục cha tồn tại + không cho danh mục tự làm cha của
  chính nó; `POST /categories/{id}/banner-image` (tái dùng service upload ảnh sẵn có).

**e) Hiển thị sản phẩm theo nhóm (khuyến mãi / danh mục nổi bật)**
- Trang chủ ở trạng thái mặc định (chưa tìm kiếm/lọc gì) giờ hiển thị các hàng sản phẩm theo nhóm:
  **"🔥 Đang giảm giá"** (sản phẩm có giá khuyến mãi, `GET /products?on_sale=true`) và 1 hàng cho
  mỗi danh mục cấp gốc nổi bật (VD "Laptop", "Điện thoại"...), mỗi hàng có link "Xem tất cả" dẫn
  sang trang danh mục tương ứng.
- Khi khách gõ tìm kiếm hoặc chọn bộ lọc, các hàng nhóm này ẩn đi, chỉ hiện lưới kết quả lọc như cũ
  (giữ nguyên trải nghiệm tìm kiếm/lọc trước đó, không xung đột).
- `components/ProductRow.tsx` (mới) — component dùng chung cho mọi hàng nhóm sản phẩm.

Đã build thử `npm run build` (FE, 22 routes) và import `app.main` (BE, 78 routes) — không lỗi.

## 22. Trạng thái hiện tại

Đã scaffold (Giai đoạn 1–2 trong tài liệu kiến trúc):
- Toàn bộ DB schema (`database/schema.sql`)
- Model SQLAlchemy đầy đủ cho các bảng chính
- Module Auth: đăng ký, đăng nhập 2 bước kèm OTP qua Redis
- Module Employee: đăng nhập nhân viên quản lý (JWT role=employee)
- Module Product: CRUD (yêu cầu đăng nhập nhân viên để ghi) + lọc theo hãng/danh mục/giá + tìm kiếm
- Module Product Import/Media: nhập Excel/CSV hàng loạt + upload/xoá ảnh sản phẩm
- Module Inventory: nhập/xuất kho (yêu cầu đăng nhập nhân viên)
- Swagger UI có cấu hình đầy đủ: tags mô tả, nút Authorize (Bearer JWT), tự động yêu cầu xác thực cho API ghi dữ liệu
- Frontend: trang chủ shop (hero, tìm kiếm, filter tabs, product card có animation) + trang quản trị sản phẩm (kèm nút import file & upload ảnh)
- Frontend đã tối ưu tầng gọi API: `lib/config.ts` + `lib/apiClient.ts` + `lib/services/*` dùng chung, tự gắn đúng loại token theo route, tự báo lỗi kết nối rõ ràng
- Module Employee: đăng nhập + CRUD tài khoản (Add User), phân quyền Quản lý/Nhân viên với quyền chi tiết (can_create/can_edit/can_delete)
- Module Cart: thêm/xem/sửa/xoá giỏ hàng, yêu cầu đăng nhập khách hàng
- Trang chi tiết sản phẩm (`/products/[id]`), trang giỏ hàng (`/cart`), trang quản lý nhân viên (`/admin/users`) đã hoạt động, nối API thật
- FilterTabs lọc thật theo hãng/danh mục/giá/chức năng (kết hợp nhiều điều kiện), đã sửa lỗi crash insertBefore
- Ảnh sản phẩm hiển thị đúng ở trang khách hàng sau khi admin upload (đã join primary_image_url)
- Logo/thương hiệu tuỳ chỉnh qua `lib/branding.ts` (giá trị mặc định) hoặc trực tiếp qua `/admin/settings` (lưu DB, ưu tiên áp dụng)
- Module Order + Payment: đặt hàng từ giỏ hàng, thanh toán COD hoặc VNPay (sandbox) với cả 2 kênh xác nhận Return URL và IPN, tra cứu đơn hàng + trang chi tiết đơn hàng riêng
- Module Promotion: mã khuyến mãi công khai/riêng theo khách hàng, áp dụng thực tế vào đơn hàng (không còn discount_amount=0 cứng)
- Module Installment: trả góp 3/6/9/12 tháng 0% lãi suất, máy tính công khai, lịch trả góp chi tiết theo từng kỳ
- Module Customer management: admin xem danh sách/chi tiết khách hàng, khoá-mở khoá tài khoản
- Module Orders Management (Admin): xem toàn bộ đơn của mọi khách hàng, lọc/tìm kiếm, cập nhật trạng thái
- Module Shipping: liên kết vận chuyển (thủ công, hoạt động đầy đủ) + webhook cho tích hợp tự động sau này, đồng bộ 2 chiều với trạng thái đơn hàng
- Module Catalog Management: admin thêm/sửa/xoá hãng và danh mục ngay trên UI (tab "Phân loại")
- Module Discount Rules: chiết khấu tự động theo hãng/danh mục/số lượng, kết hợp cộng dồn với mã khuyến mãi
- Module Installment (Admin): xem toàn bộ kế hoạch trả góp, đánh dấu đã thu tiền từng kỳ, tự hoàn tất kế hoạch khi thu đủ
- Footer thông tin cửa hàng, menu danh mục ☰ (cha/con), trang danh mục riêng với breadcrumb + banner
- Guest Checkout: đặt hàng không cần tài khoản, tự lưu thông tin đơn, tra cứu lại qua mã đơn + SĐT
- Hiển thị sản phẩm theo nhóm ở trang chủ (đang giảm giá / theo danh mục nổi bật)
- Quản lý Phân loại tối ưu: cây danh mục cha/con + banner riêng từng danh mục
- Chatbot tư vấn tự động (rule-based FAQ) + trang liên kết hotline/Zalo/Facebook
- OTP qua Email thật (SMTP) nếu đã cấu hình, fallback console nếu chưa — SMS thật cần tích hợp thêm nhà cung cấp trả phí
- Module Site Settings: admin tuỳ chỉnh tên shop/banner/mô tả/màu chủ đạo/logo, áp dụng trực tiếp lên storefront
- Đã build thử `npm run build` (FE, 22 routes) + `tsc --noEmit` và import `app.main` (BE, 78 routes) — thành công, không lỗi
- Đã test bằng script độc lập: chữ ký/IPN VNPay, khuyến mãi, trả góp, đồng bộ shipment↔order, chiết khấu tự động, guest checkout — tất cả pass
- Đã phát hiện và sửa 1 lỗi thật: ghim `bcrypt==4.0.1` trong requirements.txt (bcrypt 5.x phá vỡ passlib)

Cần bổ sung tiếp:
- Tích hợp API thật với 1 đơn vị vận chuyển cụ thể (VD: GHN) — đã viết ghi chú từng bước trong `shipping_service.py` nhưng chưa test với tài khoản thật; hệ thống vẫn hoạt động đầy đủ ở chế độ thủ công
- Nâng cấp chatbot rule-based hiện tại lên chatbot AI thật (gọi API dịch vụ AI) nếu cần hiểu ngôn ngữ tự nhiên đa dạng hơn
- Tích hợp nhà cung cấp SMS thật (Twilio/ESMS/Speedsms...) — email đã làm thật, SMS vẫn đang log console
- Cân nhắc dùng object storage (S3/MinIO) thay vì lưu ảnh trên đĩa cục bộ khi lên production
- Cân nhắc chuyển permissions từ nhúng trong JWT sang tra cứu DB mỗi request nếu cần cập nhật quyền tức thời
- Trang admin tuỳ chỉnh giao diện (`/admin/settings`) mới áp dụng cho trang chủ — mở rộng thêm sang tuỳ chỉnh trang danh mục/trang sản phẩm nếu cần (hiện danh mục đã có banner riêng, nhưng nội dung khác như màu sắc/bố cục thì chưa)
=======
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
>>>>>>> 260b90f45b26e0c0b1d60e5e28c868d7e5809a8c
