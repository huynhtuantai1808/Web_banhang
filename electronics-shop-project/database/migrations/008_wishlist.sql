-- Migration 008: Create wishlists table
-- Stores per-customer wishlist items linked to products.

CREATE TABLE IF NOT EXISTS wishlists (
    id SERIAL PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wishlist_customer_product UNIQUE (customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_customer_id
    ON wishlists(customer_id);

CREATE INDEX IF NOT EXISTS idx_wishlists_product_id
    ON wishlists(product_id);
