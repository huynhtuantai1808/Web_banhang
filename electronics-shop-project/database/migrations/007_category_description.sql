-- Migration 007: Add description column to categories
-- Supports storing a detailed description for each product category.

ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS description TEXT;
