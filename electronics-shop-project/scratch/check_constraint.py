import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from app.db.session import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'orders_payment_gateway_check'"))
        print(res.scalars().all())

asyncio.run(main())
