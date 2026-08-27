# Plan: Tin tức, Khuyến mãi & Chỉnh sửa Hồ sơ

## 1. Tin tức & Chương trình khuyến mãi

### Mô hình dữ liệu

**BlogPost model** (`backend/app/models/blog_post.py`):
```
id: UUID (PK)
title: str (max 250)
slug: str (unique) — tự động tạo từ title
summary: str | null — mô tả ngắn
content: Text — nội dung HTML/markdown
image_url: str | null
category: str — "news" | "promotion" | "guide"
is_published: bool — mặc định True
published_at: datetime | null
display_order: int — thứ tự hiển thị
created_by: UUID → employees.id
created_at, updated_at: timestamps
```

**Lý do dùng chung model:** Tin tức và khuyến mãi có cùng cấu trúc, chỉ khác `category` — tránh duplicate code.

### Backend

**Schema** (`backend/app/schemas/blog_post.py`):
- `BlogPostCreate`: title, summary, content, image_url, category, is_published, display_order
- `BlogPostUpdate`: all fields optional
- `BlogPostOut`: all fields
- `BlogPostListOut`: id, title, slug, summary, image_url, category, published_at, display_order

**API Endpoints** (`backend/app/api/v1/endpoints/blog.py`):
```
GET    /blog                    — danh sách công khai (filter by category, pagination)
GET    /blog/{slug}            — chi tiết bài viết công khai
POST   /blog                   — tạo (admin/employee)
PUT    /blog/{id}              — sửa (admin/employee)
DELETE /blog/{id}              — xóa (admin)
GET    /blog/categories        — lấy danh sách categories
```

### Frontend

**Public pages:**
- `/news` — danh sách tin tức (category=news), phân trang, tìm kiếm
- `/promotions` — danh sách khuyến mãi (category=promotion)
- `/news/[slug]` — chi tiết bài viết
- `/promotions/[slug]` — chi tiết bài viết khuyến mãi

**Admin pages:**
- `/admin/posts` — CRUD hoàn chỉnh: bảng danh sách, form tạo/sửa (modal), xóa
- Hỗ trợ filter theo category (Tin tức / Khuyến mãi / Hướng dẫn)

### Công nghệ content
- **Trình soạn thảo:** React Quill (quill) — rich text editor nhẹ, toolbar chuẩn (bold, italic, lists, links, images, headings)
- Content lưu dạng HTML (Quill tự sinh HTML)
- Upload ảnh trong content: dùng chung endpoint upload ảnh hiện có
- Slug tự tạo: `slugify(title) + "-" + short_uuid(6)`

### Public pages (TÁCH RIÊNG)
- `/news` — danh sách tin tức (category=news), phân trang, tìm kiếm
- `/news/[slug]` — chi tiết tin tức
- `/promotions` — danh sách khuyến mãi (category=promotion), phân trang
- `/promotions/[slug]` — chi tiết khuyến mãi

---

## 2. Chỉnh sửa thông tin khách hàng

### Backend

**Thêm endpoint** `PUT /customers/{id}` (đã có trong service, chỉ cần expose):
```
UpdateCustomer payload: full_name?, email?, address?, is_active?
```

**Validation:**
- Chỉ admin mới được sửa `is_active`
- Employee chỉ được sửa thông tin cá nhân

### Frontend

**Admin page:** `/admin/customers/[id]/edit`
- Form chỉnh sửa: Họ tên, Email, Địa chỉ
- Nếu là admin: thêm toggle Kích hoạt/Vô hiệu hóa
- Nút Lưu → gọi `updateCustomer(id, payload)` → thông báo thành công → quay lại danh sách

**Link từ trang danh sách:** Click vào dòng khách hàng → trang chi tiết → nút "Sửa thông tin"

---

## 3. Chỉnh sửa thông tin nhân viên

### Backend

**Thêm endpoint** `PUT /employees/{id}` (đã có EmployeeUpdate schema):
```
UpdateEmployee payload: full_name?, phone?, email?, password?, employee_role?, permissions?, is_active?
```

### Frontend

**Admin page:** `/admin/users/[id]/edit`
- Form: Họ tên, Số điện thoại, Email, Mật khẩu mới (optional), Vai trò, Quyền (nếu staff), Trạng thái
- Giữ nguyên UserFormModal cho inline edit, thêm route riêng cho form lớn

---

## Thứ tự triển khai

1. **Blog model + endpoint + service** (backend)
2. **Blog frontend service** (frontend/lib/services)
3. **Admin posts page** (CRUD: bảng + modal tạo/sửa)
4. **Public news/promotions pages** (danh sách + chi tiết)
5. **Customer edit page** (admin)
6. **Employee edit page** (admin)

---

## Files cần tạo mới

```
backend/app/models/blog_post.py
backend/app/schemas/blog_post.py
backend/app/api/v1/endpoints/blog.py
backend/app/api/v1/router.py  (thêm blog router)
frontend/lib/services/blog.ts
frontend/app/news/page.tsx
frontend/app/news/[slug]/page.tsx
frontend/app/promotions/page.tsx
frontend/app/promotions/[slug]/page.tsx
frontend/app/admin/(protected)/posts/page.tsx
frontend/app/admin/(protected)/customers/[id]/edit/page.tsx
frontend/app/admin/(protected)/users/[id]/edit/page.tsx
frontend/components/admin/PostFormModal.tsx
frontend/components/PostCard.tsx
```

## Files cần sửa

```
backend/app/api/v1/router.py  — thêm blog router
frontend/lib/services/customers.ts  — thêm updateCustomer
frontend/lib/services/employees.ts  — thêm updateEmployee
frontend/app/admin/(protected)/customers/page.tsx  — thêm link đến trang sửa
frontend/app/admin/(protected)/users/page.tsx  — thêm link đến trang sửa
frontend/components/SiteHeader.tsx  — thêm nav item Tin tức
```

## Verification

1. Backend: `curl http://localhost:8000/api/v1/blog` → danh sách bài viết
2. Admin: `/admin/posts` → tạo, sửa, xóa bài viết
3. Public: `/news` → hiển thị tin tức; `/news/slug` → chi tiết
4. Admin customer: `/admin/customers` → click sửa → form chỉnh sửa → lưu
5. Admin employee: `/admin/users` → click sửa → form chỉnh sửa → lưu
