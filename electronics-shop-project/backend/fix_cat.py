import sqlite3

def main():
    conn = sqlite3.connect('database/shop.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM categories WHERE name = 'Điện thoại'")
    cats = cursor.fetchall()
    print("Điện thoại categories:", cats)
    
    if len(cats) > 1:
        main_id = cats[0][0]
        dup_id = cats[1][0]
        print(f"Moving products from {dup_id} to {main_id}")
        cursor.execute("UPDATE products SET category_id = ? WHERE category_id = ?", (main_id, dup_id))
        cursor.execute("DELETE FROM categories WHERE id = ?", (dup_id,))
        conn.commit()
        print("Duplicate deleted.")
        
    conn.close()

if __name__ == "__main__":
    main()
