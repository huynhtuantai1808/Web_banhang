"""
Migration: Add quick_links to site_settings table
Run: cd backend && python database/migrate_quick_links.py
"""
import sys
import os

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

ADD_COLUMN_SQL = """
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS quick_links JSONB DEFAULT '[]'::jsonb;
"""

if __name__ == "__main__":
    from sqlalchemy import text
    try:
        from app.db.session import engine
        import asyncio
        
        async def run_migration():
            print("Connecting to DB...")
            async with engine.begin() as conn:
                print("Executing ALTER TABLE site_settings...")
                await conn.execute(text(ADD_COLUMN_SQL))
                print("Success!")
        
        asyncio.run(run_migration())
    except Exception as e:
        print("Failed to run migration via sqlalchemy. Error:", e)
        print("Please run this SQL manually in your database:")
        print(ADD_COLUMN_SQL)
