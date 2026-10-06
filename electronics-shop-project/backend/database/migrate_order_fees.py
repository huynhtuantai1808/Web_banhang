import asyncio
import os
import sys

# Thêm đường dẫn project vào sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import engine

async def migrate():
    async with engine.begin() as conn:
        print("Checking/Adding insurance_fee and shipping_fee columns to orders table...")
        
        # Check if column exists
        check_query_1 = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='orders' AND column_name='insurance_fee';
        """)
        res = await conn.execute(check_query_1)
        if not res.fetchone():
            print("Adding insurance_fee column...")
            await conn.execute(text("ALTER TABLE orders ADD COLUMN insurance_fee NUMERIC(14,2) NOT NULL DEFAULT 0;"))
        else:
            print("Column insurance_fee already exists.")
            
        check_query_2 = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='orders' AND column_name='shipping_fee';
        """)
        res = await conn.execute(check_query_2)
        if not res.fetchone():
            print("Adding shipping_fee column...")
            await conn.execute(text("ALTER TABLE orders ADD COLUMN shipping_fee NUMERIC(14,2) NOT NULL DEFAULT 0;"))
        else:
            print("Column shipping_fee already exists.")

    print("Migration completed!")

if __name__ == "__main__":
    asyncio.run(migrate())
