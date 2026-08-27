"""
Migration: Create blog_posts table
Run: cd backend && python database/migrate.py
Or apply the SQL below directly in your database.
"""
import sys
import os

# Thêm thư mục cha (backend/) vào sys.path để import được 'app'
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(250) NOT NULL,
    slug VARCHAR(280) NOT NULL UNIQUE,
    summary TEXT,
    content TEXT,
    image_url VARCHAR(500),
    category VARCHAR(30) NOT NULL DEFAULT 'news',
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    published_at TIMESTAMPTZ,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
"""

REVERT_SQL = """
DROP TABLE IF EXISTS blog_posts;
"""

if __name__ == "__main__":
    from sqlalchemy import text
    try:
        from app.db.session import engine
        import asyncio

        async def run():
            async with engine.begin() as conn:
                await conn.execute(text(CREATE_TABLE_SQL))
            print("✓ blog_posts table created")

        asyncio.run(run())
    except Exception as e:
        print(f"Could not auto-migrate: {e}")
        print("\nRun this SQL manually in your database:\n")
        print(CREATE_TABLE_SQL)
