import asyncio
import os
import sys

# Đảm bảo import được các module trong app/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import engine
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError

async def fix_constraint():
    print("Bắt đầu xử lý xóa ràng buộc cũ trong CSDL...")
    async with engine.begin() as conn:
        try:
            # Xóa constraint cũ (orders_payment_gateway_check)
            await conn.execute(text("ALTER TABLE orders DROP CONSTRAINT orders_payment_gateway_check"))
            print("- Đã xóa thành công constraint 'orders_payment_gateway_check' trên bảng orders.")
        except ProgrammingError as e:
            if "does not exist" in str(e):
                print("- Ràng buộc 'orders_payment_gateway_check' không tồn tại (đã được xóa).")
            else:
                print(f"- Lỗi khi xóa constraint: {e}")
        except Exception as e:
            print(f"- Lỗi khi thực thi (có thể ràng buộc không tồn tại): {e}")

    print("HOÀN TẤT.")

if __name__ == "__main__":
    asyncio.run(fix_constraint())
