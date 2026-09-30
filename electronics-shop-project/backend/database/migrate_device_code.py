import sys
import os

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

SQL_COMMANDS = [
    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS device_code VARCHAR(100);"
]

if __name__ == "__main__":
    from sqlalchemy import text
    try:
        from app.db.session import engine
        import asyncio

        async def run():
            async with engine.begin() as conn:
                for sql in SQL_COMMANDS:
                    await conn.execute(text(sql))
            print("✓ Migration complete: Added device_code to order_items")

        asyncio.run(run())
    except Exception as e:
        print(f"Could not auto-migrate: {e}")
        print("\nRun this SQL manually in your database:\n")
        print("\n".join(SQL_COMMANDS))
