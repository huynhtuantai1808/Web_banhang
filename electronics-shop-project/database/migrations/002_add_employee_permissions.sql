-- Chạy file này nếu bạn đã tạo DB từ schema.sql PHIÊN BẢN CŨ (chưa có cột permissions).
-- Nếu tạo DB mới từ schema.sql hiện tại thì KHÔNG cần chạy file này (đã có sẵn cột này rồi).

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
