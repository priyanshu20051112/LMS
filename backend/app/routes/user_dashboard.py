from flask import Flask,Blueprint,jsonify,request,current_app
from app.db import get_connection
from app.routes.auth import username
from datetime import date,timedelta
import jwt
dashboard = Blueprint("dashboard",__name__)

def ensure_book_ratings_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS book_ratings (
            rating_id INT AUTO_INCREMENT PRIMARY KEY,
            book_id INT NOT NULL,
            moodle_id VARCHAR(32) NOT NULL,
            rating DECIMAL(2,1) NOT NULL,
            rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_book_rating (book_id, moodle_id),
            FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE
        )
        """
    )

    # Backward compatibility for previously created table versions.
    try:
        cursor.execute("ALTER TABLE book_ratings DROP FOREIGN KEY book_ratings_ibfk_2")
    except Exception:
        pass

    try:
        cursor.execute("ALTER TABLE book_ratings MODIFY moodle_id VARCHAR(32) NOT NULL")
    except Exception:
        pass

@dashboard.route("/dashboard",methods=["GET"])
def user_dashboard():
    #jwt verification
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify(
            {
                "message": "token missing"
            }
        ),401
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(
            token,
           current_app.config["SECRET_KEY"],
           algorithms=["HS256"]
        )
    except jwt.ExpiredSignatureError :
        return jsonify(
            {
                "message":"token expired"
            }
        ),401
    except jwt.InvalidTokenError:
        return jsonify(
            {
                "message":"invalid token"
            }
        ),401
    moodle_id = payload["moodle_id"]
    name= username(moodle_id)
    #search bar
    searched= request.args.get("search","")
    conn=get_connection()
    cursor=conn.cursor(dictionary=True)
    if searched:
        cursor.execute("""
                    SELECT 
                b.book_id,
                b.book_name,
                b.publisher,
                b.description,
                   b.cover_url,
                                COALESCE(b.rating, 0) AS rating,
                COUNT(bc.copy_id) AS total_copies,
                COUNT(bc.copy_id) 
                - COUNT(CASE WHEN t.status = 'issued' THEN 1 END) 
                AS available_copies
            FROM books b
            LEFT JOIN book_copies bc 
                ON b.book_id = bc.book_id
            LEFT JOIN transactions t 
                ON bc.copy_id = t.copy_id 
                AND t.status = 'issued'
            WHERE b.book_name LIKE %s
            GROUP BY 
                b.book_id,
                b.book_name,
                b.publisher,
                   b.description,
                   b.cover_url,
                   b.rating
        """, ("%" + searched + "%",))
    else:
        cursor.execute("""
            SELECT 
                b.book_id,
                b.book_name,
                b.publisher,
                b.description,
                   b.cover_url,
                                COALESCE(b.rating, 0) AS rating,
                COUNT(bc.copy_id) AS total_copies,
                COUNT(bc.copy_id) 
                - COUNT(CASE WHEN t.status = 'issued' THEN 1 END) 
                AS available_copies
            FROM books b
            LEFT JOIN book_copies bc 
                ON b.book_id = bc.book_id
            LEFT JOIN transactions t 
                ON bc.copy_id = t.copy_id 
                AND t.status = 'issued'
            GROUP BY 
                b.book_id,
                b.book_name,
                b.publisher,
                   b.description,
                   b.cover_url,
                   b.rating
        """)
    #already issued books
    all_books = cursor.fetchall()
    cursor.execute("""
                SELECT 
                    b.book_id,
                    b.book_name,
                    b.publisher,
               b.cover_url,
                    COALESCE(b.rating, 0) AS rating,
                    t.issue_date,
                    t.due_date
                FROM transactions t
                JOIN book_copies bc ON t.copy_id = bc.copy_id
                JOIN books b ON bc.book_id = b.book_id
                WHERE t.moodle_id = %s
                AND t.status = 'issued'
    """, (moodle_id,))
    issued_books = cursor.fetchall()

    cursor.execute(
        """
        SELECT
            r.request_id,
            r.book_id,
            b.book_name,
            b.publisher,
            b.cover_url,
            r.status,
            r.request_date
        FROM issue_requests r
        JOIN books b ON r.book_id = b.book_id
        WHERE r.moodle_id = %s
                    AND r.status = 'pending'
        ORDER BY r.request_date DESC
        """,
        (moodle_id,),
    )
    requested_books = cursor.fetchall()
    conn.close()
    


    return jsonify(
        {
            "message": f"Welcome to dashboard",
            "moodle_id":moodle_id,
            "username":name,
            "Total_books":len(all_books),
            "books" : all_books,
            "issued_books": issued_books,
            "issued_count":len(issued_books),
            "requested_books": requested_books,
            "requested_count": len(requested_books)
        }
    ),200


@dashboard.route("/history", methods=["GET"])
def user_history():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "token missing"}), 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=["HS256"],
        )
    except jwt.ExpiredSignatureError:
        return jsonify({"message": "token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"message": "invalid token"}), 401

    moodle_id = payload["moodle_id"]
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                r.request_id,
                r.book_id,
                b.book_name,
                b.publisher,
                r.status,
                r.request_date
            FROM issue_requests r
            JOIN books b ON b.book_id = r.book_id
            WHERE r.moodle_id = %s
            ORDER BY r.request_date DESC
            """,
            (moodle_id,),
        )
        request_history = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                t.transaction_id,
                b.book_id,
                b.book_name,
                b.publisher,
                t.issue_date,
                t.due_date,
                t.return_date,
                t.status
            FROM transactions t
            JOIN book_copies bc ON bc.copy_id = t.copy_id
            JOIN books b ON b.book_id = bc.book_id
            WHERE t.moodle_id = %s
            ORDER BY t.issue_date DESC
            """,
            (moodle_id,),
        )
        transaction_history = cursor.fetchall()

        return jsonify(
            {
                "request_history": request_history,
                "request_count": len(request_history),
                "transaction_history": transaction_history,
                "transaction_count": len(transaction_history),
            }
        ), 200
    finally:
        conn.close()

MAX_BOOKS_ALLOWED = 2
MAX_DAYS_ALLOWED = 7


@dashboard.route("/request-book", methods=["POST"])
def request_book():
    """Student creates a request to issue a book"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Token missing"}), 401

    token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=["HS256"]
        )
    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid token"}), 401

    moodle_id = str(payload["moodle_id"])
    data = request.get_json()
    book_id = data.get("book_id")

    if not book_id:
        return jsonify({"message": "Book ID required"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check if student already has 2 active books
        cursor.execute("""
            SELECT COUNT(*) AS active_count
            FROM transactions
            WHERE moodle_id = %s
            AND status = 'issued'
        """, (moodle_id,))

        active = cursor.fetchone()["active_count"]

        if active >= MAX_BOOKS_ALLOWED:
            return jsonify({
                "message": "You already have 2 books issued"
            }), 400

        # Check if student already has this book
        cursor.execute("""
            SELECT t.transaction_id
            FROM transactions t
            JOIN book_copies bc ON t.copy_id = bc.copy_id
            WHERE t.moodle_id = %s
            AND bc.book_id = %s
            AND t.status = 'issued'
        """, (moodle_id, book_id))

        already = cursor.fetchone()

        if already:
            return jsonify({
                "message": "You already have this book issued"
            }), 400

        # Check if there's already a pending request for this book
        cursor.execute("""
            SELECT request_id FROM issue_requests
            WHERE moodle_id = %s
            AND book_id = %s
            AND status = 'pending'
        """, (moodle_id, book_id))

        pending = cursor.fetchone()

        if pending:
            return jsonify({
                "message": "You already have a pending request for this book"
            }), 400

        # Check if book is available
        cursor.execute("""
            SELECT bc.copy_id
            FROM book_copies bc
            LEFT JOIN transactions t
                ON bc.copy_id = t.copy_id
                AND t.status = 'issued'
            WHERE bc.book_id = %s
            AND t.copy_id IS NULL
            LIMIT 1
        """, (book_id,))

        available_copy = cursor.fetchone()

        if not available_copy:
            return jsonify({
                "message": "No copies available currently"
            }), 400

        # Create the request
        cursor.execute("""
            INSERT INTO issue_requests
            (moodle_id, book_id, status)
            VALUES (%s, %s, 'pending')
        """, (moodle_id, book_id))

        conn.commit()

        return jsonify({
            "message": "Book request submitted successfully. Please collect from library when admin approves."
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({
            "message": "Something went wrong",
            "error": str(e)
        }), 500

    finally:
        conn.close()


# Keep the old rent-book endpoint for backward compatibility (optional)
@dashboard.route("/rent-book", methods=["POST"])
def rent_book():
    """Direct book issue - redirects to request-book"""
    return request_book()

@dashboard.route("/rate-book", methods=["POST"])
def rate_book():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Token missing"}), 401

    token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=["HS256"]
        )
    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid token"}), 401

    data = request.get_json() or {}
    book_id = data.get("book_id")
    rating = data.get("rating")

    if not book_id or rating is None:
        return jsonify({"message": "Book ID and rating are required"}), 400

    try:
        rating_value = float(rating)
    except (TypeError, ValueError):
        return jsonify({"message": "Rating must be a number"}), 400

    if rating_value < 1 or rating_value > 5:
        return jsonify({"message": "Rating must be between 1 and 5"}), 400

    moodle_id = payload["moodle_id"]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        ensure_book_ratings_table(cursor)

        cursor.execute("SELECT book_id FROM books WHERE book_id = %s", (book_id,))
        if not cursor.fetchone():
            return jsonify({"message": "Book not found"}), 404

        cursor.execute(
            """
            INSERT INTO book_ratings (book_id, moodle_id, rating)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
                rating = VALUES(rating),
                rated_at = CURRENT_TIMESTAMP
            """,
            (book_id, moodle_id, rating_value),
        )

        cursor.execute(
            "SELECT ROUND(AVG(rating), 1) AS average_rating FROM book_ratings WHERE book_id = %s",
            (book_id,),
        )
        avg_row = cursor.fetchone() or {}
        average_rating = float(avg_row.get("average_rating") or 0)

        cursor.execute(
            "UPDATE books SET rating = %s WHERE book_id = %s",
            (average_rating, book_id),
        )

        conn.commit()

        return jsonify(
            {
                "message": "Rating saved successfully",
                "book_id": int(book_id),
                "user_rating": rating_value,
                "average_rating": average_rating,
            }
        ), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": "Failed to save rating", "error": str(e)}), 500

    finally:
        conn.close()