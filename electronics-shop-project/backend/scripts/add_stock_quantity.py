import asyncio
import os
import sys
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.db.session import engine

async def add_stock_column():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE products ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0;"))
            print("Đã thêm thành công cột 'stock_quantity' vào bảng 'products'.")
        except Exception as e:
            if "already exists" in str(e):
                print("Cột 'stock_quantity' đã tồn tại, bỏ qua.")
            else:
                print(f"Lỗi: {e}")

if __name__ == "__main__":
    asyncio.run(add_stock_column())
