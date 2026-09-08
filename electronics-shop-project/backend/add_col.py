import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        try:
            await db.execute(text("ALTER TABLE site_settings ADD COLUMN store_addresses JSONB DEFAULT '[]'::jsonb;"))
            await db.commit()
            print("Successfully added store_addresses column.")
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
