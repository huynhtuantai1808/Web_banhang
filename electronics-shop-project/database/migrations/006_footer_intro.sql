-- Migration 006: Add footer_intro column to site_settings
-- The footer_intro column is already defined in Python models/schemas
-- but was missing from the database schema.

ALTER TABLE site_settings
    ADD COLUMN IF NOT EXISTS footer_intro TEXT;
