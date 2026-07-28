-- Chạy file này nếu bạn đã tạo DB từ schema.sql PHIÊN BẢN CŨ (chưa có bảng vận chuyển).
-- Nếu tạo DB mới từ schema.sql hiện tại thì KHÔNG cần chạy file này.

CREATE TABLE IF NOT EXISTS shipments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID UNIQUE REFERENCES orders(id),
    carrier         VARCHAR(50) NOT NULL,
    tracking_code   VARCHAR(100),
    status          VARCHAR(30) DEFAULT 'pending',
    shipping_fee    NUMERIC(14,2) DEFAULT 0,
    note            TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipment_status_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id     UUID REFERENCES shipments(id) ON DELETE CASCADE,
    status          VARCHAR(30) NOT NULL,
    note            TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);
