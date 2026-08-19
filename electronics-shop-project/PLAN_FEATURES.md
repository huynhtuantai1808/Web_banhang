# Plan: Bổ sung & Tối ưu tính năng Electronics Shop

## Context
User yêu cầu bổ sung nhiều tính năng mới và tối ưu giao diện cho dự án Electronics Shop. Cần ưu tiên thứ tự: DB migration → Backend → Frontend.

---

## Phase 0: Database Migration (1 file)

**File:** `database/migrations/006_footer_intro.sql`

```sql
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_intro TEXT;
```

`footer_intro` đã được định nghĩa trong Python models/schemas nhưng thiếu cột trong DB.

---

## Phase 1: Backend Changes

### 1.1 Add `GET /inventory` endpoint

**File:** `backend/app/api/v1/endpoints/inventory.py`

Thêm endpoint mới trả danh sách tồn kho đầy đủ:
```python
@router.get("")
async def list_inventory(
    category_id: int | None = Query(None),
    brand_id: int | None = Query(None),
    stock_status: str | None = Query(None),  # in_stock | out_of_stock | low_stock
    db: AsyncSession = Depends(get_db),
    _employee_id: str = Depends(require_employee),
):
```
Trả về: product_id, name, category, brand, price, total_in_stock, sold_count

### 1.2 Update OTP Login - hỗ trợ Email

**File:** `backend/app/schemas/auth.py` — cập nhật `LoginRequest`:
```python
class LoginRequest(BaseModel):
    phone: str | None = None
    email: str | None = None  # thay thế phone, cho phép đăng nhập bằng email
    password: str
```

**File:** `backend/app/api/v1/endpoints/auth.py` — cập nhật `login_step1`:
- Tìm customer bằng email thay vì phone
- OTP service đã hỗ trợ email sending qua SMTP (chỉ cần gọi đúng)

---

## Phase 2: Frontend Services (3 files mới)

### 2.1 `frontend/lib/services/inventory.ts` (NEW)
```typescript
export interface InventoryItem {
  id: string; name: string; category: string; brand: string;
  price: number; in_stock: number; sold: number;
}
export async function listInventory(filters): Promise<InventoryItem[]>
```

### 2.2 `frontend/lib/services/reports.ts` (NEW)
```typescript
export interface RevenueReport {
  period: string; from_date: string; to_date: string;
  total_revenue: number; order_count: number;
  top_products: { name: string; quantity_sold: number; revenue: number }[];
  top_customers: { name: string; order_count: number; total_spend: number }[];
  daily_revenue: { date: string; revenue: number }[];
}
export async function getRevenueReport(period: string, date?: string): Promise<RevenueReport>
export async function sendRevenueEmail(toEmail: string, period: string, date?: string)
```

### 2.3 `frontend/lib/services/adminOrders.ts` — thêm 2 functions
```typescript
export async function getOrderInvoice(orderId: string): Promise<InvoiceData>
export async function sendOrderInvoiceEmail(orderId: string): Promise<{ message: string }>
```

---

## Phase 3: Frontend UI Changes

### 3.1 Category Menu - Dời về bên trái
**File:** `frontend/app/page.tsx`

Đổi thứ tự trong Hero section:
```tsx
// TRƯỚC:
<div className="flex flex-wrap gap-3 max-w-xl">
  <div className="flex-1 min-w-[240px]">
    <SearchBar onSearch={handleSearch} />
  </div>
  <CategoryMenu />
</div>

// SAU:
<div className="flex flex-wrap gap-3 max-w-xl">
  <CategoryMenu />
  <div className="flex-1 min-w-[240px]">
    <SearchBar onSearch={handleSearch} />
  </div>
</div>
```

### 3.2 Product Multi-Image Gallery
**File:** `frontend/components/ProductCard.tsx`

- Thêm state: `imgIdx`, `images` (array), `hover`
- Auto-rotate: `setInterval` mỗi 3 giây khi không hover
- Navigation dots ở dưới ảnh
- Props mới: `productImages?: string[]`

### 3.3 Checkout UI Enhancement
**File:** `frontend/app/checkout/page.tsx`

Làm nổi bật 2 phần thanh toán:
- Đổi `border-dashed` → `border-solid` với shadow glow
- Thêm icons (Wallet, Truck, CreditCard)
- Thêm badge "Gợi ý" cho COD
- Thêm hover scale effect với Framer Motion

---

## Phase 4: Admin Pages Mới

### 4.1 Admin Navigation - Thêm menu items
**File:** `frontend/app/admin/(protected)/layout.tsx`

Thêm 4 nav items:
```tsx
import { FileText, PackageSearch, BarChart3 } from 'lucide-react'
{ href: "/admin/invoices", label: "Hóa đơn", icon: FileText, adminOnly: false },
{ href: "/admin/inventory", label: "Tồn kho", icon: PackageSearch, adminOnly: true },
{ href: "/admin/reports", label: "Báo cáo", icon: BarChart3, adminOnly: true },
```

### 4.2 Hóa đơn Page
**File:** `frontend/app/admin/(protected)/invoices/page.tsx` (NEW)

- Table list orders với trạng thái invoice
- Click row → modal với chi tiết hóa đơn
- Nút "Xem hóa đơn" → printable view (CSS `@media print`)
- Nút "Gửi email" hóa đơn cho khách

### 4.3 Tồn kho Page
**File:** `frontend/app/admin/(protected)/inventory/page.tsx` (NEW)

- Table: Tên SP, Danh mục, Hãng, Giá, Tồn kho, Đã bán
- Filter: danh mục, hãng, trạng thái tồn kho (tabs)
- Nút Export CSV (client-side với Blob)

### 4.4 Báo cáo Doanh thu Page
**File:** `frontend/app/admin/(protected)/reports/page.tsx` (NEW)

- Filter: Hôm nay / Tuần này / Tháng này / Tùy chỉnh
- Summary cards: Tổng doanh thu, Số đơn hàng
- Top sản phẩm table
- Biểu đồ doanh thu theo ngày (CSS bar chart)
- Nút "Gửi báo cáo qua email"

---

## Phase 5: Login Page - OTP Email

**File:** `frontend/app/login/page.tsx`

- Thêm toggle: "Đăng nhập bằng SĐT" / "Đăng nhập bằng Email"
- Khi chọn Email: hiện input email thay vì phone
- Cập nhật message OTP: "Mã OTP đã được gửi qua email/SĐT"
- Backend đã hỗ trợ, chỉ cần update frontend form + API call

**File:** `frontend/lib/services/auth.ts` — update `loginStep1`:
```typescript
export async function loginStep1(
  credentials: { phone: string; password: string } | { email: string; password: string }
)
```

---

## Tổng hợp Files cần tạo/sửa

| # | File | Action |
|---|------|--------|
| 1 | `database/migrations/006_footer_intro.sql` | Tạo mới |
| 2 | `backend/app/api/v1/endpoints/inventory.py` | Sửa - thêm GET endpoint |
| 3 | `backend/app/schemas/auth.py` | Sửa - thêm email field |
| 4 | `backend/app/api/v1/endpoints/auth.py` | Sửa - hỗ trợ login bằng email |
| 5 | `frontend/lib/services/inventory.ts` | Tạo mới |
| 6 | `frontend/lib/services/reports.ts` | Tạo mới |
| 7 | `frontend/lib/services/adminOrders.ts` | Sửa - thêm 2 functions |
| 8 | `frontend/lib/services/auth.ts` | Sửa - update loginStep1 |
| 9 | `frontend/app/page.tsx` | Sửa - đổi thứ tự CategoryMenu |
| 10 | `frontend/components/ProductCard.tsx` | Sửa - multi-image gallery |
| 11 | `frontend/app/checkout/page.tsx` | Sửa - enhance payment UI |
| 12 | `frontend/app/admin/(protected)/layout.tsx` | Sửa - thêm nav items |
| 13 | `frontend/app/admin/(protected)/invoices/page.tsx` | Tạo mới |
| 14 | `frontend/app/admin/(protected)/inventory/page.tsx` | Tạo mới |
| 15 | `frontend/app/admin/(protected)/reports/page.tsx` | Tạo mới |
| 16 | `frontend/app/login/page.tsx` | Sửa - thêm email option |

---

## Verification

1. Chạy migration: `psql < database/migrations/006_footer_intro.sql`
2. Khởi động backend: `cd backend && uvicorn app.main:app --reload`
3. Khởi động frontend: `cd frontend && npm run dev`
4. Test từng feature:
   - [ ] Đăng nhập bằng email → nhận OTP qua email
   - [ ] Homepage: Category menu bên trái, auto-rotate ảnh sản phẩm
   - [ ] Checkout: các ô thanh toán nổi bật hơn
   - [ ] Admin nav: thấy 4 menu items mới
   - [ ] /admin/invoices: xem & gửi hóa đơn
   - [ ] /admin/inventory: xem tồn kho, export CSV
   - [ ] /admin/reports: xem báo cáo doanh thu, gửi email
   - [ ] Footer: nội dung động từ site_settings

---

## Thứ tự triển khai đề xuất

```
1. DB Migration (006_footer_intro.sql)
2. Backend: inventory endpoint + auth update
3. Frontend services: inventory.ts, reports.ts, adminOrders.ts
4. Frontend: page.tsx (CategoryMenu), ProductCard (gallery)
5. Frontend: login/page.tsx (OTP email)
6. Frontend: checkout/page.tsx (UI enhancement)
7. Frontend: admin pages mới + nav update
```
