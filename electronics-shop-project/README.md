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
cp .env.example .env.local
npm run dev
```
Giao diện chạy tại `http://localhost:3000`, trang quản trị tại `http://localhost:3000/admin/products`.

## 4. Trạng thái hiện tại

Đã scaffold (Giai đoạn 1–2 trong tài liệu kiến trúc):
- Toàn bộ DB schema (`database/schema.sql`)
- Model SQLAlchemy đầy đủ cho các bảng chính
- Module Auth: đăng ký, đăng nhập 2 bước kèm OTP qua Redis
- Module Product: CRUD + lọc theo hãng/danh mục/giá + tìm kiếm
- Module Inventory: nhập/xuất kho
- Frontend: trang chủ shop (hero, tìm kiếm, filter tabs, product card có animation) + trang quản trị sản phẩm

Cần bổ sung tiếp (xem TODO trong `backend/app/api/v1/router.py`):
- Cart, Order, Installment (trả góp), Promotion/Discount, Employee management, Category CRUD
- Middleware phân quyền JWT theo role nhân viên
- Tích hợp nhà cung cấp SMS/Email thật cho OTP (hiện đang log ra console ở môi trường dev)
