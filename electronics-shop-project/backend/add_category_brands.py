import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        try:
            await db.execute(text("ALTER TABLE site_settings ADD COLUMN category_brands JSONB DEFAULT '{}'::jsonb;"))
            await db.commit()
            print("Successfully added category_brands column to site_settings.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
