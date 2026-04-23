from flask import jsonify, Blueprint
from app.db import get_connection
from app.routes.admin_dashboard import verify_admin
from app.cache import cache
analytics = Blueprint("analytics", __name__, url_prefix="/analytics")

@analytics.route("/show", methods=["GET"])
def show():
    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    cache_key = "analytics:top20"
    top_books = cache.get(cache_key)

    if top_books is None:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        try:
            cursor.execute(
                """
                SELECT
                    b.book_id,
                    b.book_name,
                    b.publisher,
                    COALESCE(b.rating, 0) AS rating,
                    COUNT(t.transaction_id) AS issue_count,
                    COUNT(bc.copy_id) AS total_copies,
                    COUNT(bc.copy_id) - COUNT(CASE WHEN t.status = 'issued' THEN 1 END) AS available_copies
                FROM books b
                LEFT JOIN book_copies bc ON b.book_id = bc.book_id
                LEFT JOIN transactions t
                    ON bc.copy_id = t.copy_id
                    AND t.status IN ('issued', 'returned')
                GROUP BY
                    b.book_id,
                    b.book_name,
                    b.publisher,
                    b.rating
                ORDER BY issue_count DESC, b.book_name ASC
                LIMIT 20
                """
            )
            top_books = cursor.fetchall()
            cache.set(cache_key, top_books, timeout=120)
        finally:
            conn.close()

    return jsonify({"top_books": top_books, "count": len(top_books)}), 200