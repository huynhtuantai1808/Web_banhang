import asyncio
import json
from app.db.session import SessionLocal
from app.models.product import Category
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        res = await db.execute(select(Category))
        categories = res.scalars().all()
        print(json.dumps([{"id": c.id, "name": c.name} for c in categories], ensure_ascii=False, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
