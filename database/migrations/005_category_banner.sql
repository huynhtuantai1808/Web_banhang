-- Chạy file này nếu bạn đã tạo DB từ schema.sql PHIÊN BẢN CŨ (chưa có banner riêng cho danh mục).
-- Nếu tạo DB mới từ schema.sql hiện tại thì KHÔNG cần chạy file này.

ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
