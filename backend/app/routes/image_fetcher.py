from flask import Flask, jsonify
import requests
from urllib.parse import quote
import time
from app.db import get_connection
def Fetcher (title,publisher):
    query=quote(f"{title} {publisher}")
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}"
    try:
        res = requests.get(url,timeout=5).json()
        if 'items' not in res or not res['items']:
            return None
        book = res['items'][0]
        return book['volumeInfo'].get('imageLinks', {}).get('thumbnail')
    except:
        return None
    
def Check_Cover():
    conn= get_connection()
    cursor= conn.cursor()
    cursor.execute("SELECT book_id,book_name,publisher FROM books WHERE cover_url IS NULL")
    seen={}
    for book_id,title,publisher in cursor.fetchall():
        title = title or ""
        publisher = publisher or ""
        key = (title.strip().lower() + publisher.strip().lower())
        if key in seen:
            cover = seen[key]
        else:
            cover=Fetcher(title,publisher)
            seen[key]=cover
        if cover:
            cursor.execute(
                "UPDATE books SET cover_url=%s WHERE book_id=%s",
                (cover,book_id)
            )
            conn.commit()
            print(f"updated-->{title}")
        else:
            print(f"no cover {title}")
        time.sleep(0.2)
    
    conn.close()

if __name__ == "__main__":
    Check_Cover()
