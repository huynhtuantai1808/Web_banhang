-- Migration 010: Banners table for marketing promotions on homepage

CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    subtitle VARCHAR(250),
    description TEXT,
    image_url VARCHAR(500) NOT NULL,
    link_url VARCHAR(500),
    cta_label VARCHAR(60),
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    position VARCHAR(20) DEFAULT 'hero',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_banners_position ON banners(position);

-- Seed sample banners
INSERT INTO banners (title, subtitle, description, image_url, link_url, cta_label, position, display_order, is_active)
VALUES
    ('ĐỔI MỚI SANG TRANG - TƯƠNG LAI VỰT SÁNG', 'Ưu đãi đến 2.5TR+', 'HSSV & Giáo viên giảm đến 300K · RAM giảm đến 1.4TR · Laptop giảm đến 2.5TR+', '/uploads/banners/banner1.png', '/products?category_id=1', 'Khám phá ngay', 'hero', 1, TRUE),
    ('PC GAMING - GIÁ SỐC CUỐI NĂM', 'Giảm đến 30%', 'Trang bị dàn PC gaming đỉnh cao với CPU thế hệ mới nhất', '/uploads/banners/banner2.png', '/products?feature=gaming', 'Mua ngay', 'hero', 2, TRUE),
    ('KHUYẾN MÃI MÀN HÌNH', 'Giảm 1.5TR', 'Màn hình gaming, văn phòng chính hãng giá tốt nhất', '/uploads/banners/banner3.png', '/products?keyword=màn hình', 'Xem ngay', 'promo', 3, TRUE)
ON CONFLICT DO NOTHING;
