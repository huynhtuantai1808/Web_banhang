import sqlite3

def main():
    conn = sqlite3.connect('database/shop.db')
    print(conn.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall())
    conn.close()

if __name__ == "__main__":
    main()
