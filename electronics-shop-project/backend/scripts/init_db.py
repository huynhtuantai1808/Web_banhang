import asyncio
import os
import sys

# Đảm bảo import được các module trong app/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.base import Base
from app.db.session import engine
# Sửa lại import seed_users tuỳ thuộc vào file seed_users.py
from scripts.seed_users import main as seed_main

async def init_db():
    print("Bắt đầu khởi tạo cơ sở dữ liệu...")
    async with engine.begin() as conn:
        print("- Đang tạo các bảng...")
        # Lệnh này sẽ tự động đọc toàn bộ Models hiện tại (đã bao gồm các cột mới thêm)
        # và tạo bảng nếu chúng chưa tồn tại. 
        # CÁC CỘT MỚI SẼ TỰ ĐỘNG CÓ MẶT mà không cần chạy các file add_col.py cũ.
        await conn.run_sync(Base.metadata.create_all)
        print("- Đã tạo xong các bảng.")

    print("\nTiến hành tạo dữ liệu mẫu (Seed Users)...")
    await seed_main()
    print("\nHOÀN TẤT KHỞI TẠO CƠ SỞ DỮ LIỆU.")

if __name__ == "__main__":
    asyncio.run(init_db())
