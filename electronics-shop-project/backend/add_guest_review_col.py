import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        try:
            await db.execute(text("ALTER TABLE product_reviews ALTER COLUMN customer_id DROP NOT NULL;"))
            await db.execute(text("ALTER TABLE product_reviews ADD COLUMN guest_name VARCHAR;"))
            await db.commit()
            print("Successfully updated product_reviews table.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
