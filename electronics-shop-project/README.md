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

## 10. Trạng thái hiện tại

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
- Logo/thương hiệu tuỳ chỉnh qua `lib/branding.ts`
- Đã build thử `npm run build` + `tsc --noEmit` (FE) và import `app.main` (BE) — thành công, không lỗi

Cần bổ sung tiếp:
- Module Order/Checkout thật (trang giỏ hàng hiện có nút "Tiến hành thanh toán" nhưng chưa nối API — cần thiết kế luồng đặt hàng, chọn địa chỉ, xác nhận)
- Installment (trả góp), Promotion/Discount, Category CRUD riêng
- Trang danh sách khách hàng cho admin xem/quản lý (hiện admin mới quản lý được nhân viên, chưa có trang xem khách hàng)
- Tích hợp nhà cung cấp SMS/Email thật cho OTP (hiện đang log ra console ở môi trường dev)
- Cân nhắc dùng object storage (S3/MinIO) thay vì lưu ảnh trên đĩa cục bộ khi lên production
- Cân nhắc chuyển permissions từ nhúng trong JWT sang tra cứu DB mỗi request nếu cần cập nhật quyền tức thời (không phải chờ đăng nhập lại)
