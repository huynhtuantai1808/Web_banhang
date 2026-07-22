-- =========================================================
-- SCHEMA CSDL - WEBSITE BÁN ĐỒ ĐIỆN TỬ (PostgreSQL)
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- hỗ trợ tìm kiếm gần đúng

-- ================= KHÁCH HÀNG =================
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code   VARCHAR(20) UNIQUE NOT NULL,          -- mã khách hàng, VD: KH000001
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(15) UNIQUE NOT NULL,
    email           VARCHAR(150) UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    address         TEXT,
    is_verified     BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ================= NHÂN VIÊN / QUẢN LÝ =================
CREATE TABLE roles (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(50) UNIQUE NOT NULL       -- admin, sale_staff, warehouse_staff...
);

CREATE TABLE employees (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code   VARCHAR(20) UNIQUE NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(15) UNIQUE NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role_id         INT REFERENCES roles(id),
    -- Phân quyền chi tiết cho nhân viên vai trò "staff": {"can_create": true, "can_edit": true, "can_delete": false}
    -- Vai trò "admin" (Quản lý) luôn full quyền, không phụ thuộc cột này.
    permissions     JSONB DEFAULT '{}'::jsonb,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ================= DANH MỤC / HÃNG =================
CREATE TABLE brands (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100) UNIQUE NOT NULL          -- Apple, Samsung, Dell, Asus...
);

CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,             -- Điện thoại, Laptop, Máy tính bảng, PC Gaming
    slug        VARCHAR(100) UNIQUE NOT NULL,
    parent_id   INT REFERENCES categories(id)
);

-- ================= SẢN PHẨM =================
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code    VARCHAR(30) UNIQUE NOT NULL,    -- Mã sản phẩm
    name            VARCHAR(255) NOT NULL,          -- Tên sản phẩm
    description     TEXT,                           -- Mô tả sản phẩm
    brand_id        INT REFERENCES brands(id),
    category_id     INT REFERENCES categories(id),
    color           VARCHAR(50),                    -- Màu / chất liệu
    material        VARCHAR(100),
    size_dimension  VARCHAR(100),                   -- Kích thước
    specification   JSONB,                          -- Cấu hình (RAM, CPU, ổ cứng, màn hình...)
    price           NUMERIC(14,2) NOT NULL,
    discount_price  NUMERIC(14,2),
    is_installment_eligible BOOLEAN DEFAULT TRUE,   -- Cho phép trả góp
    status          VARCHAR(20) DEFAULT 'active',   -- active, discontinued
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_specification ON products USING gin (specification);

-- Từng đơn vị tồn kho cụ thể (theo Serial/IMEI)
CREATE TABLE product_units (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID REFERENCES products(id),
    serial_number   VARCHAR(100) UNIQUE NOT NULL,    -- Serial
    imei_code       VARCHAR(50) UNIQUE,              -- Mã máy / IMEI
    status          VARCHAR(20) DEFAULT 'in_stock',  -- in_stock, sold, reserved, defective
    imported_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE product_images (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    is_primary  BOOLEAN DEFAULT FALSE
);

-- ================= KHO: NHẬP / XUẤT =================
CREATE TABLE inventory_transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID REFERENCES products(id),
    employee_id     UUID REFERENCES employees(id),
    type            VARCHAR(10) NOT NULL CHECK (type IN ('import','export')),
    quantity        INT NOT NULL,
    note            TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ================= GIỎ HÀNG =================
CREATE TABLE carts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) UNIQUE,
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cart_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id     UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id  UUID REFERENCES products(id),
    quantity    INT NOT NULL DEFAULT 1,
    UNIQUE(cart_id, product_id)
);

-- ================= KHUYẾN MÃI / CHIẾT KHẤU =================
CREATE TABLE promotions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(30) UNIQUE NOT NULL,     -- Mã khuyến mãi
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    discount_type   VARCHAR(10) CHECK (discount_type IN ('percent','amount')),
    discount_value  NUMERIC(14,2) NOT NULL,
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    max_usage       INT,
    used_count      INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE
);

-- Phân bổ mã khuyến mãi cho từng khách hàng cụ thể
CREATE TABLE promotion_customer (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id    UUID REFERENCES promotions(id) ON DELETE CASCADE,
    customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE,
    is_used         BOOLEAN DEFAULT FALSE,
    assigned_at     TIMESTAMPTZ DEFAULT now(),
    used_at         TIMESTAMPTZ,
    UNIQUE(promotion_id, customer_id)
);

-- Quy tắc chiết khấu theo danh mục/hãng/số lượng
CREATE TABLE discount_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id     INT REFERENCES categories(id),
    brand_id        INT REFERENCES brands(id),
    min_quantity    INT DEFAULT 1,
    discount_percent NUMERIC(5,2),
    valid_from      TIMESTAMPTZ,
    valid_to        TIMESTAMPTZ
);

-- ================= ĐƠN HÀNG =================
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code      VARCHAR(30) UNIQUE NOT NULL,
    customer_id     UUID REFERENCES customers(id),
    promotion_id    UUID REFERENCES promotions(id),
    total_amount    NUMERIC(14,2) NOT NULL,
    discount_amount NUMERIC(14,2) DEFAULT 0,
    final_amount    NUMERIC(14,2) NOT NULL,
    payment_method  VARCHAR(20) DEFAULT 'full' CHECK (payment_method IN ('full','installment')),
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, confirmed, shipping, completed, cancelled
    shipping_address TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id  UUID REFERENCES products(id),
    unit_price  NUMERIC(14,2) NOT NULL,
    quantity    INT NOT NULL
);

-- ================= MUA TRẢ GÓP =================
CREATE TABLE installment_plans (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            UUID REFERENCES orders(id),
    total_months        INT NOT NULL,
    monthly_amount      NUMERIC(14,2) NOT NULL,
    interest_rate       NUMERIC(5,2) DEFAULT 0,
    down_payment        NUMERIC(14,2) DEFAULT 0,
    status              VARCHAR(20) DEFAULT 'active', -- active, completed, overdue
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE installment_payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id             UUID REFERENCES installment_plans(id) ON DELETE CASCADE,
    period_no           INT NOT NULL,
    due_date            DATE NOT NULL,
    amount              NUMERIC(14,2) NOT NULL,
    paid_at             TIMESTAMPTZ,
    status              VARCHAR(20) DEFAULT 'unpaid'  -- unpaid, paid, overdue
);

-- ================= OTP (bản ghi lịch sử, giá trị chính lưu ở Redis TTL) =================
CREATE TABLE otp_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target      VARCHAR(150) NOT NULL,   -- phone hoặc email
    purpose     VARCHAR(30) NOT NULL,    -- login, register, reset_password
    is_success  BOOLEAN,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ================= INDEX BỔ SUNG =================
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_price ON products(price);
