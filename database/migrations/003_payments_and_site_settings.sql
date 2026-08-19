-- Chạy file này nếu bạn đã tạo DB từ schema.sql PHIÊN BẢN CŨ (chưa có thanh toán/site_settings).
-- Nếu tạo DB mới từ schema.sql hiện tại thì KHÔNG cần chạy file này.

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(20) DEFAULT 'cod',
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(100);

CREATE TABLE IF NOT EXISTS site_settings (
    id                  SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    site_name           VARCHAR(100) NOT NULL DEFAULT 'TechTrace',
    hero_title          VARCHAR(255) NOT NULL DEFAULT 'Công nghệ chính hãng, kết nối đúng nhu cầu của bạn.',
    hero_subtitle       VARCHAR(100) NOT NULL DEFAULT 'TechTrace Store',
    hero_description    TEXT NOT NULL DEFAULT 'Điện thoại, laptop, máy tính bảng, PC gaming — trả góp 0% lãi suất, bảo hành chính hãng, giao nhanh toàn quốc.',
    banner_image_url    TEXT,
    logo_image_url      TEXT,
    accent_color        VARCHAR(7) NOT NULL DEFAULT '#C87F45',
    updated_at          TIMESTAMPTZ DEFAULT now()
);

INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
