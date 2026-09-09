import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
from app.db.session import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT * FROM installment_plans ORDER BY created_at DESC LIMIT 5"))
        keys = res.keys()
        for row in res.fetchall():
            print(dict(zip(keys, row)))

asyncio.run(main())
