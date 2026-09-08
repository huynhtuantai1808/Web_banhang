import asyncio
import os
import sqlite3
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine
from app.db.base import Base
from app.core.config import settings
from dotenv import load_dotenv

# Load env in case it wasn't
load_dotenv()

async def init_postgres():
    # settings.DATABASE_URL will be postgresql+asyncpg://...
    print(f"Initializing PostgreSQL database at {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        
    await engine.dispose()
    print("PostgreSQL tables created.")

def migrate_data():
    sqlite_db_path = "database/shop.db"
    if not os.path.exists(sqlite_db_path):
        print(f"SQLite database not found at {sqlite_db_path}. Skipping migration.")
        return
        
    print("Migrating data from SQLite to PostgreSQL...")
    
    # We need a sync URL for PostgreSQL to easily insert data
    # Convert postgresql+asyncpg:// to postgresql://
    pg_sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
    pg_engine = create_engine(pg_sync_url)
    
    # Connect to SQLite
    sqlite_conn = sqlite3.connect(sqlite_db_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()
    
    # Get all tables from SQLite
    sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in sqlite_cursor.fetchall() if row[0] not in ('sqlite_sequence', 'alembic_version')]
    
    # We must insert in order of dependencies, or disable foreign key checks during insert
    # Disabling FK checks in Postgres for the session:
    with pg_engine.begin() as pg_conn:
        pg_conn.execute(text("SET session_replication_role = 'replica';"))
        
        for table in tables:
            print(f"Migrating table {table}...")
            sqlite_cursor.execute(f"SELECT * FROM {table}")
            rows = sqlite_cursor.fetchall()
            if not rows:
                continue
                
            columns = rows[0].keys()
            
            # Prepare insert statement
            col_names = ", ".join([f'"{c}"' for c in columns])
            placeholders = ", ".join([f":{c}" for c in columns])
            insert_sql = text(f'INSERT INTO "{table}" ({col_names}) VALUES ({placeholders})')
            
            # Convert rows to dicts
            data = []
            for row in rows:
                row_dict = dict(row)
                # Some JSON fields in SQLite might need to be cast or kept as strings? 
                # Postgres asyncpg/psycopg2 handles JSON fields if mapped as JSON, 
                # but with raw SQL we might need to be careful. Let's see if it just works.
                data.append(row_dict)
                
            pg_conn.execute(insert_sql, data)
            
        pg_conn.execute(text("SET session_replication_role = 'origin';"))
        
    sqlite_conn.close()
    print("Data migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(init_postgres())
    migrate_data()
