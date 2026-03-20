from flask import Flask,request,Blueprint,jsonify,current_app
from app.db import get_connection
import jwt
from datetime import date, datetime, timedelta
import os
import random
import smtplib
from email.message import EmailMessage

admin= Blueprint("admin",__name__)

MAX_BOOKS_ALLOWED = 2
MAX_DAYS_ALLOWED = 7
OTP_EXPIRY_MINUTES = 10


def ensure_request_otps_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS request_otps (
            otp_id INT AUTO_INCREMENT PRIMARY KEY,
            request_id INT NOT NULL UNIQUE,
            moodle_id INT NOT NULL,
            otp_code VARCHAR(10) NOT NULL,
            expires_at DATETIME NOT NULL,
            is_verified TINYINT(1) DEFAULT 0,
            attempts INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (request_id) REFERENCES issue_requests(request_id) ON DELETE CASCADE,
            FOREIGN KEY (moodle_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )


def generate_otp():
    return f"{random.randint(100000, 999999)}"


def send_otp_email(to_email, student_name, book_name, otp):
    smtp_host = os.environ.get("SMTP_HOST", "").strip()
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "").strip()
    smtp_password = os.environ.get("SMTP_PASSWORD", "").strip()
    smtp_from = os.environ.get("SMTP_FROM", smtp_user).strip()

    if not smtp_host:
        return False, "SMTP is not configured"

    try:
        msg = EmailMessage()
        msg["Subject"] = "Library Book Collection OTP"
        msg["From"] = smtp_from
        msg["To"] = to_email
        msg.set_content(
            f"Hello {student_name},\n\n"
            f"Your OTP to collect '{book_name}' from library is: {otp}\n"
            f"This OTP is valid for {OTP_EXPIRY_MINUTES} minutes.\n\n"
            "If you did not request this, please ignore this email."
        )

        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            server.starttls()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)

        return True, None
    except Exception as e:
        return False, str(e)


def issue_request_transaction(cursor, request_id):
    cursor.execute(
        """
        SELECT book_id, moodle_id
        FROM issue_requests
        WHERE request_id = %s
        AND status = 'pending'
        """,
        (request_id,),
    )
    request_data = cursor.fetchone()

    if not request_data:
        return False, "Invalid request", 400

    book_id = request_data["book_id"]
    moodle_id = request_data["moodle_id"]

    cursor.execute(
        """
        SELECT COUNT(*) AS count
        FROM transactions
        WHERE moodle_id = %s
        AND status = 'issued'
        """,
        (moodle_id,),
    )
    if cursor.fetchone()["count"] >= MAX_BOOKS_ALLOWED:
        return False, "User reached max rental limit", 400

    cursor.execute(
        """
        SELECT bc.copy_id
        FROM book_copies bc
        LEFT JOIN transactions t
            ON bc.copy_id = t.copy_id
            AND t.status = 'issued'
        WHERE bc.book_id = %s
        AND t.copy_id IS NULL
        LIMIT 1
        FOR UPDATE
        """,
        (book_id,),
    )
    copy = cursor.fetchone()

    if not copy:
        return False, "No copy available", 400

    issue_date = date.today()
    due_date = issue_date + timedelta(days=MAX_DAYS_ALLOWED)

    cursor.execute(
        """
        INSERT INTO transactions
        (copy_id, moodle_id, issue_date, due_date, status)
        VALUES (%s, %s, %s, %s, 'issued')
        """,
        (copy["copy_id"], moodle_id, issue_date, due_date),
    )

    cursor.execute(
        """
        UPDATE issue_requests
        SET status = 'approved'
        WHERE request_id = %s
        """,
        (request_id,),
    )

    return True, "Request approved", 200

def verify_admin():
    auth_header= request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None, ("token missing",400)
    token = auth_header.split(" ")[1]
    try: 
        payload = jwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=["HS256"]
        )
    except jwt.ExpiredSignatureError:
        return None, ("Token expired", 401)
    except jwt.InvalidTokenError:
        return None, ("Invalid token", 401)
    if payload.get("moodle_id") != "28106191":
        return None,("Unauthorized access",403)
    return payload, None

@admin.route("/admin/requests", methods=["GET"])
def view_requests():

    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT r.request_id,
               r.book_id,
               b.book_name,
               r.moodle_id,
               r.request_date
        FROM issue_requests r
        JOIN books b ON r.book_id = b.book_id
        WHERE r.status = 'pending'
        ORDER BY r.request_date ASC
    """)

    requests = cursor.fetchall()
    conn.close()

    return jsonify({"requests": requests}), 200

@admin.route("/admin/approve/<int:request_id>", methods=["POST"])
def approve_request(request_id):

    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        conn.start_transaction()

        success, message, status_code = issue_request_transaction(cursor, request_id)
        if not success:
            conn.rollback()
            return jsonify({"message": message}), status_code

        conn.commit()
        return jsonify({"message": message}), status_code

    except Exception as e:
        conn.rollback()
        return jsonify({"message": str(e)}), 500

    finally:
        conn.close()


@admin.route("/admin/send-otp/<int:request_id>", methods=["POST"])
def send_collection_otp(request_id):
    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        ensure_request_otps_table(cursor)

        cursor.execute(
            """
            SELECT r.request_id, r.moodle_id, b.book_name, u.fullname, u.email
            FROM issue_requests r
            JOIN books b ON r.book_id = b.book_id
            JOIN users u ON r.moodle_id = u.id
            WHERE r.request_id = %s AND r.status = 'pending'
            """,
            (request_id,),
        )
        request_data = cursor.fetchone()

        if not request_data:
            return jsonify({"message": "Invalid or already processed request"}), 400

        if not request_data["email"]:
            return jsonify({"message": "Student email not available"}), 400

        otp = generate_otp()
        expires_at = datetime.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)

        cursor.execute(
            """
            INSERT INTO request_otps (request_id, moodle_id, otp_code, expires_at, is_verified, attempts)
            VALUES (%s, %s, %s, %s, 0, 0)
            ON DUPLICATE KEY UPDATE
                otp_code = VALUES(otp_code),
                expires_at = VALUES(expires_at),
                is_verified = 0,
                attempts = 0,
                created_at = CURRENT_TIMESTAMP
            """,
            (request_id, request_data["moodle_id"], otp, expires_at),
        )
        conn.commit()

        sent, mail_error = send_otp_email(
            request_data["email"],
            request_data["fullname"],
            request_data["book_name"],
            otp,
        )

        if sent:
            return jsonify(
                {
                    "message": f"OTP sent to {request_data['email']}",
                    "otp_delivery": "email",
                }
            ), 200

        # Development fallback when SMTP is not configured.
        if mail_error == "SMTP is not configured":
            return jsonify(
                {
                    "message": "OTP sent successfully (Demo Mode)",
                    "otp_delivery": "demo",
                    "dev_otp": otp,
                }
            ), 200

        return jsonify({"message": "OTP generation failed. Please try again."}), 500
    finally:
        conn.close()


@admin.route("/admin/verify-otp/<int:request_id>", methods=["POST"])
def verify_collection_otp(request_id):
    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    data = request.get_json() or {}
    entered_otp = (data.get("otp") or "").strip()
    if not entered_otp:
        return jsonify({"message": "otp is required"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        conn.start_transaction()
        ensure_request_otps_table(cursor)

        cursor.execute(
            """
            SELECT otp_code, expires_at, is_verified, attempts
            FROM request_otps
            WHERE request_id = %s
            FOR UPDATE
            """,
            (request_id,),
        )
        otp_row = cursor.fetchone()

        if not otp_row:
            conn.rollback()
            return jsonify({"message": "OTP not generated for this request"}), 400

        if otp_row["is_verified"]:
            conn.rollback()
            return jsonify({"message": "OTP already used"}), 400

        if datetime.now() > otp_row["expires_at"]:
            conn.rollback()
            return jsonify({"message": "OTP expired. Please send OTP again."}), 400

        if entered_otp != otp_row["otp_code"]:
            cursor.execute(
                """
                UPDATE request_otps
                SET attempts = attempts + 1
                WHERE request_id = %s
                """,
                (request_id,),
            )
            conn.commit()
            return jsonify({"message": "Invalid OTP"}), 400

        cursor.execute(
            """
            UPDATE request_otps
            SET is_verified = 1
            WHERE request_id = %s
            """,
            (request_id,),
        )

        success, message, status_code = issue_request_transaction(cursor, request_id)
        if not success:
            conn.rollback()
            return jsonify({"message": message}), status_code

        conn.commit()
        return jsonify({"message": "OTP verified and book issued successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": str(e)}), 500
    finally:
        conn.close()

@admin.route("/admin/reject/<int:request_id>", methods=["POST"])
def reject_request(request_id):

    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE issue_requests
        SET status = 'rejected'
        WHERE request_id = %s
    """, (request_id,))

    conn.commit()
    conn.close()

    return jsonify({"message": "Request rejected"}), 200


@admin.route("/admin/user/<int:moodle_id>", methods=["GET"])
def view_user_books(moodle_id):

    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            t.transaction_id,
            b.book_name,
            t.issue_date,
            t.due_date,
            DATEDIFF(t.due_date, CURDATE()) AS days_remaining
        FROM transactions t
        JOIN book_copies bc ON t.copy_id = bc.copy_id
        JOIN books b ON bc.book_id = b.book_id
        WHERE t.moodle_id = %s
        AND t.status = 'issued'
    """, (moodle_id,))

    books = cursor.fetchall()
    conn.close()

    return jsonify({"books": books}), 200


@admin.route("/admin/reissue/<int:transaction_id>", methods=["POST"])
def reissue_book(transaction_id):

    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE transactions
        SET due_date = DATE_ADD(due_date, INTERVAL 7 DAY)
        WHERE transaction_id = %s
        AND status = 'issued'
    """, (transaction_id,))

    conn.commit()
    conn.close()

    return jsonify({"message": "Book reissued for 7 more days"}), 200


@admin.route("/admin/return/<int:transaction_id>", methods=["POST"])
def return_book(transaction_id):
    """Admin marks a book as returned when student brings it back"""
    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check if transaction exists and is issued
        cursor.execute("""
            SELECT transaction_id, status
            FROM transactions
            WHERE transaction_id = %s
        """, (transaction_id,))

        transaction = cursor.fetchone()

        if not transaction:
            return jsonify({"message": "Transaction not found"}), 404

        if transaction["status"] != "issued":
            return jsonify({"message": "Book is not currently issued"}), 400

        # Mark as returned
        cursor.execute("""
            UPDATE transactions
            SET status = 'returned',
                return_date = CURDATE()
            WHERE transaction_id = %s
        """, (transaction_id,))

        conn.commit()
        return jsonify({"message": "Book returned successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": str(e)}), 500

    finally:
        conn.close()


@admin.route("/admin/all-books", methods=["GET"])
def get_all_books():
    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    search = request.args.get("search", "").strip()
    
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        if search:
            cursor.execute("""
                SELECT 
                    b.book_id,
                    b.book_name,
                    b.publisher,
                    b.description,
                    COUNT(bc.copy_id) AS total_copies,
                    COUNT(bc.copy_id) 
                    - COUNT(CASE WHEN t.status = 'issued' THEN 1 END) 
                    AS available_copies,
                    COUNT(CASE WHEN t.status = 'issued' THEN 1 END) AS issued_copies
                FROM books b
                LEFT JOIN book_copies bc 
                    ON b.book_id = bc.book_id
                LEFT JOIN transactions t 
                    ON bc.copy_id = t.copy_id 
                    AND t.status = 'issued'
                WHERE b.book_name LIKE %s OR b.publisher LIKE %s OR b.description LIKE %s
                GROUP BY 
                    b.book_id,
                    b.book_name,
                    b.publisher,
                    b.description
                ORDER BY b.book_name ASC
            """, ("%" + search + "%", "%" + search + "%", "%" + search + "%"))
        else:
            cursor.execute("""
               SELECT 
                    b.book_id,
                    b.book_name,
                    b.publisher,
                    b.description,
                    COUNT(bc.copy_id) AS total_copies,
                    COUNT(bc.copy_id) 
                    - COUNT(CASE WHEN t.status = 'issued' THEN 1 END) 
                    AS available_copies,
                    COUNT(CASE WHEN t.status = 'issued' THEN 1 END) AS issued_copies
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
                    b.description
                ORDER BY b.book_name ASC
LIMIT 100
            """)
        
        books = cursor.fetchall()
        return jsonify({"books": books, "count": len(books)}), 200

    finally:
        conn.close()


@admin.route("/admin/issued-books", methods=["GET"])
def get_all_issued_books():
    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                t.transaction_id,
                t.moodle_id,
                u.fullname,
                b.book_id,
                b.book_name,
                t.issue_date,
                t.due_date,
                DATEDIFF(t.due_date, CURDATE()) AS days_remaining
            FROM transactions t
            JOIN users u ON t.moodle_id = u.id
            JOIN book_copies bc ON t.copy_id = bc.copy_id
            JOIN books b ON bc.book_id = b.book_id
            WHERE t.status = 'issued'
            ORDER BY t.issue_date DESC
        """)

        issued_books = cursor.fetchall()
        return jsonify({"issued_books": issued_books, "count": len(issued_books)}), 200
    finally:
        conn.close()


@admin.route("/admin/students", methods=["GET"])
def get_all_students():
    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                u.id AS moodle_id,
                u.fullname,
                u.department,
                u.email,
                COUNT(CASE WHEN t.status = 'issued' THEN 1 END) AS issued_books
            FROM users u
            LEFT JOIN transactions t ON u.id = t.moodle_id
            GROUP BY u.id, u.fullname, u.department, u.email
            ORDER BY u.id ASC
        """)

        students = cursor.fetchall()
        return jsonify({"students": students, "count": len(students)}), 200
    finally:
        conn.close()


@admin.route("/admin/history", methods=["GET"])
def get_admin_history():
    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                r.request_id,
                r.book_id,
                b.book_name,
                r.moodle_id,
                u.fullname,
                r.status,
                r.request_date
            FROM issue_requests r
            JOIN books b ON b.book_id = r.book_id
            LEFT JOIN users u ON u.id = r.moodle_id
            ORDER BY r.request_date DESC
            """
        )
        request_history = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                t.transaction_id,
                t.moodle_id,
                u.fullname,
                b.book_id,
                b.book_name,
                t.issue_date,
                t.due_date,
                t.return_date,
                t.status
            FROM transactions t
            JOIN users u ON u.id = t.moodle_id
            JOIN book_copies bc ON bc.copy_id = t.copy_id
            JOIN books b ON b.book_id = bc.book_id
            ORDER BY t.issue_date DESC
            """
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


@admin.route("/admin/books", methods=["POST"])
def add_book():
    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    data = request.get_json() or {}
    book_name = (data.get("book_name") or "").strip()
    publisher = (data.get("publisher") or "").strip() or None
    description = (data.get("description") or "").strip() or None
    cover_url = (data.get("cover_url") or "").strip() or None
    total_copies = data.get("total_copies", 1)

    if not book_name:
        return jsonify({"message": "book_name is required"}), 400

    try:
        total_copies = int(total_copies)
    except (TypeError, ValueError):
        return jsonify({"message": "total_copies must be a number"}), 400

    if total_copies < 1:
        return jsonify({"message": "total_copies must be at least 1"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        conn.start_transaction()

        cursor.execute(
            """
            INSERT INTO books (book_name, publisher, description, cover_url)
            VALUES (%s, %s, %s, %s)
            """,
            (book_name, publisher, description, cover_url),
        )

        book_id = cursor.lastrowid

        for index in range(1, total_copies + 1):
            barcode = f"BK-{book_id}-{index}-{int(date.today().strftime('%Y%m%d'))}"
            cursor.execute(
                """
                INSERT INTO book_copies (book_id, barcode)
                VALUES (%s, %s)
                """,
                (book_id, barcode),
            )

        conn.commit()
        return jsonify(
            {
                "message": "Book added successfully",
                "book_id": book_id,
                "copies_added": total_copies,
            }
        ), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"message": str(e)}), 500
    finally:
        conn.close()


@admin.route("/admin/books/<int:book_id>", methods=["DELETE"])
def delete_book(book_id):
    payload, error = verify_admin()
    if error:
        return jsonify({"message": error[0]}), error[1]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        conn.start_transaction()

        cursor.execute("SELECT book_id, book_name FROM books WHERE book_id = %s", (book_id,))
        book = cursor.fetchone()
        if not book:
            conn.rollback()
            return jsonify({"message": "Book not found"}), 404

        # Prevent deleting books that are currently issued.
        cursor.execute(
            """
            SELECT COUNT(*) AS active_issues
            FROM transactions t
            JOIN book_copies bc ON t.copy_id = bc.copy_id
            WHERE bc.book_id = %s AND t.status = 'issued'
            """,
            (book_id,),
        )
        active_issues = (cursor.fetchone() or {}).get("active_issues", 0)
        if active_issues and int(active_issues) > 0:
            conn.rollback()
            return jsonify({"message": "Cannot delete: this book has active issued copies"}), 400

        # Clean dependent records first.
        cursor.execute("DELETE FROM request_otps WHERE request_id IN (SELECT request_id FROM issue_requests WHERE book_id = %s)", (book_id,))
        cursor.execute("DELETE FROM issue_requests WHERE book_id = %s", (book_id,))
        cursor.execute("DELETE FROM book_ratings WHERE book_id = %s", (book_id,))
        cursor.execute(
            """
            DELETE t FROM transactions t
            JOIN book_copies bc ON t.copy_id = bc.copy_id
            WHERE bc.book_id = %s
            """,
            (book_id,),
        )
        cursor.execute("DELETE FROM book_copies WHERE book_id = %s", (book_id,))
        cursor.execute("DELETE FROM books WHERE book_id = %s", (book_id,))

        conn.commit()
        return jsonify({"message": f"Book '{book['book_name']}' deleted successfully", "book_id": book_id}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": str(e)}), 500
    finally:
        conn.close()