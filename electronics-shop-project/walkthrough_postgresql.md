# Walkthrough: PostgreSQL Integration

## Changes Made
- **Environment Configuration**: Created a `.env` file in the `backend/` directory pointing to a local PostgreSQL instance.
- **Docker Compose**: Added `docker-compose.yml` in the project root to easily spin up a PostgreSQL 15 container and a Redis container.
- **Data Migration Script**: Created a script `backend/migrate_db.py` that connects to the new PostgreSQL database via `asyncpg`, creates all required tables (including the new `chat_rooms` and `chat_messages`), and copies existing data from `database/shop.db` over to the new PostgreSQL instance.

## Action Required by You
To complete the transition to PostgreSQL, please perform the following steps in your terminal:

1. **Start the PostgreSQL server** using Docker (run this in the project root):
   ```bash
   docker-compose up -d
   ```
   *(If you don't use Docker Desktop, ensure your local PostgreSQL server is running at port 5432 with username `postgres` and password `your_password`, and create a database named `electronics_shop`.)*

2. **Run the Database Migration Script** (run this inside the `backend` folder):
   ```bash
   python migrate_db.py
   ```
   This will initialize the tables and transfer all your SQLite data to PostgreSQL.

3. **Restart the Backend Server**:
   If your FastAPI server is currently running, restart it so it can pick up the new `DATABASE_URL` from the `.env` file.

> [!TIP]
> After successfully migrating, you can safely ignore or delete `database/shop.db`. The application is now fully running on PostgreSQL!
