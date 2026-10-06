import asyncio
import sys
from sqlalchemy import text

sys.path.append('.')

from app.db.session import async_engine

async def migrate():
    print("Starting migration: add group_code to products")
    async with async_engine.begin() as conn:
        # Check if column exists first
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='group_code'"))
        exists = result.scalar()
        if not exists:
            await conn.execute(text("ALTER TABLE products ADD COLUMN group_code VARCHAR(100)"))
            await conn.execute(text("CREATE INDEX ix_products_group_code ON products (group_code)"))
            print("Successfully added group_code column")
        else:
            print("Column group_code already exists")

if __name__ == "__main__":
    asyncio.run(migrate())
