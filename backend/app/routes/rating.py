import random
from app.db import get_connection

def generate_rating():
    return round(random.triangular(3.0, 5.0, 4.2), 1)

def update_ratings():
    print("Script started...")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT book_id FROM books")  
    rows = cursor.fetchall()

    print(f"Books found: {len(rows)}")

    for (book_id,) in rows:
        rating = generate_rating()

        cursor.execute(
            "UPDATE books SET rating=%s WHERE book_id=%s",
            (rating, book_id)
        )

        conn.commit()
        print(f"Updated rating for book_id {book_id}: {rating}")

    conn.close()

if __name__ == "__main__":
    update_ratings()