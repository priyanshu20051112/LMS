"""
AI Assistant Routes for Library Management System
-------------------------------------------------
This module provides AI-powered book recommendation endpoints.
The AI is READ-ONLY and can only search/recommend books.
"""

from flask import Blueprint, jsonify, request, current_app
from app.db import get_connection
from app.config import get_openai_key
import jwt
import os
from openai import OpenAI

# Blueprint for AI routes
ai = Blueprint("ai", __name__, url_prefix="/ai")

# In-memory conversation state (keyed by moodle_id)
# Structure: { moodle_id: { "level": "beginner/intermediate/advanced", "history": [] } }
conversation_state = {}

# System prompt that enforces READ-ONLY behavior and proper recommendations
SYSTEM_PROMPT = """You are a friendly Library Assistant AI for a college library management system.

YOUR ROLE:
- Help students find books from the library's collection
- Provide helpful explanations about why each book suits their needs
- Use simple, student-friendly language
- Be conversational and encouraging

STRICT RULES (NEVER VIOLATE):
1. You are READ-ONLY. You CANNOT reserve, issue, borrow, return, or modify any books.
2. You can ONLY recommend books from the search results provided to you.
3. If search results are empty, say "No matching books are currently available in our library."
4. NEVER hallucinate or make up book titles, authors, or details.
5. NEVER act as an admin or perform any administrative tasks.
6. If a user asks you to do something outside your capabilities, politely explain you can only help find and recommend books.

RESPONSE FORMAT (CRITICAL):
- Write in plain text ONLY. DO NOT use markdown formatting.
- DO NOT use asterisks (*), bold (**), or any markdown syntax.
- Use simple numbered lists with plain text.
- Each book recommendation should be on a new line starting with a number.
- Keep explanations concise but helpful (1-2 sentences per book).
- Be encouraging and conversational.

EXAMPLE GOOD RESPONSE:
"Here are some beginner-friendly books from our collection that match your interest in artificial intelligence:

1. ARTIFICIAL INTELLIGENCE: A MODERN APPROACH
This book is great for beginners because it explains complex ideas like machine learning and neural networks in a clear, step-by-step way. It uses real-world examples, making it easy to understand.

2. ARTIFICIAL INTELLIGENCE & THE STUDY OF AGENTIVE BEHAVIOUR
A comprehensive introduction perfect for students starting their AI journey."

Remember: Plain text only, no markdown symbols. You can ONLY suggest books from the search results. Never invent books."""


def verify_token():
    """
    Verify JWT token from Authorization header.
    Returns moodle_id if valid, None otherwise.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=["HS256"]
        )
        return payload.get("moodle_id")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# Synonym/related terms mapping for better search
# Maps abbreviations/short forms to full search terms
SYNONYM_MAP = {
    "aiml": ["artificial intelligence", "machine learning"],
    "ai": ["artificial intelligence"],
    "ml": ["machine learning"],
    "dsa": ["data structures", "algorithms"],
    "ds": ["data structures"],
    "algo": ["algorithms"],
    "web": ["web development", "html", "javascript"],
    "dbms": ["database", "sql"],
    "os": ["operating system"],
    "cn": ["computer network", "networking"],
    "cyber": ["cyber security", "cryptography"],
    "oops": ["object oriented", "oop"],
    "cpp": ["c++"],
}


def expand_search_terms(query):
    """
    Expand query with related/synonym terms.
    Only expands if exact match found in synonym map.
    """
    query_lower = query.lower().strip()
    
    # Check for exact match in synonym map
    if query_lower in SYNONYM_MAP:
        return SYNONYM_MAP[query_lower]
    
    # Otherwise just return original query
    return [query]


def search_books(query):
    """
    Search books in database by title or description.
    Returns list of books with available copies.
    This is a READ-ONLY operation.
    Supports synonym expansion for better results.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Expand query with related terms
        search_terms = expand_search_terms(query)
        
        # Build dynamic WHERE clause for multiple terms
        where_conditions = []
        params = []
        
        # Create relevance scoring - exact phrase matches score higher
        case_conditions = []
        
        for term in search_terms:
            search_term = f"%{term}%"
            where_conditions.append("(b.book_name LIKE %s OR b.description LIKE %s)")
            params.extend([search_term, search_term])
            # Add case for relevance scoring (exact phrase match)
            case_conditions.append(f"CASE WHEN b.book_name LIKE %s THEN 10 ELSE 0 END")
            params.insert(0, search_term)  # Add at beginning for ORDER BY
        
        where_clause = " OR ".join(where_conditions)
        relevance_score = " + ".join(case_conditions)
        
        # Rebuild params in correct order
        score_params = []
        search_params = []
        for term in search_terms:
            search_term = f"%{term}%"
            score_params.append(search_term)
            search_params.extend([search_term, search_term])
        
        all_params = score_params + search_params
        
        cursor.execute(f"""
            SELECT 
                b.book_id,
                b.book_name AS title,
                b.publisher,
                b.description,
                COUNT(bc.copy_id) AS total_copies,
                COUNT(bc.copy_id) 
                  - COUNT(CASE WHEN t.status = 'issued' THEN 1 END) 
                  AS available_copies,
                ({relevance_score}) as relevance
            FROM books b
            LEFT JOIN book_copies bc 
                ON b.book_id = bc.book_id
            LEFT JOIN transactions t 
                ON bc.copy_id = t.copy_id 
                AND t.status = 'issued'
            WHERE {where_clause}
            GROUP BY 
                b.book_id,
                b.book_name,
                b.publisher,
                b.description
            HAVING available_copies > 0
            ORDER BY relevance DESC, b.book_name ASC
        """, tuple(all_params))
        
        books = cursor.fetchall()
        # Remove relevance from results
        for book in books:
            book.pop('relevance', None)
        return books
    
    finally:
        cursor.close()
        conn.close()


@ai.route("/search", methods=["GET"])
def ai_search():
    """
    GET /ai/search
    Search for books matching query string.
    
    Query Parameters:
        - query: Search term for book title/description
    
    Returns:
        - List of books with book_id, title, description, available_copies
    """
    # Verify user is authenticated
    moodle_id = verify_token()
    if not moodle_id:
        return jsonify({"message": "Authentication required"}), 401
    
    # Get search query
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify({"message": "Query parameter required"}), 400
    
    # Search books (READ-ONLY)
    books = search_books(query)
    
    return jsonify({
        "query": query,
        "count": len(books),
        "books": books
    }), 200


@ai.route("/ask", methods=["POST"])
def ai_ask():
    """
    POST /ai/ask
    Process natural language question from student.
    
    Request Body:
        { "question": "string" }
    
    Returns:
        {
            "answer": "string",
            "books": [],
            "needs_clarification": bool
        }
    """
    # Verify user is authenticated
    moodle_id = verify_token()
    if not moodle_id:
        return jsonify({"message": "Authentication required"}), 401
    
    # Get question from request body
    data = request.get_json()
    if not data or not data.get("question"):
        return jsonify({"message": "Question is required"}), 400
    
    question = data["question"].strip()
    
    # Initialize conversation state for user if not exists
    if moodle_id not in conversation_state:
        conversation_state[moodle_id] = {
            "level": None,
            "history": [],
            "pending_topic": None,
            "stage": "awaiting_topic"  # Start at awaiting_topic since frontend already shows the question
        }
    
    user_state = conversation_state[moodle_id]
    
    # Stage 1: First interaction - Ask for topic
    if user_state.get("stage") == "start":
        user_state["stage"] = "awaiting_topic"
        return jsonify({
            "answer": "Hi! I'm here to help you find the perfect books. What subject or topic are you interested in?\n\nHere are some popular topics from our library:\n\n1. Artificial Intelligence & Machine Learning\n2. Web Development (HTML, CSS, JavaScript, React)\n3. Data Structures & Algorithms\n4. Python Programming\n5. Database Management & SQL\n6. Cyber Security\n7. Object Oriented Programming\n8. Computer Networks\n\nJust type the topic you're interested in, or pick one from above!",
            "books": [],
            "needs_clarification": True
        }), 200
    
    # Stage 2: User responded with topic - Save it and ask for level
    if user_state.get("stage") == "awaiting_topic":
        topic = extract_topic(question)
        if not topic or len(topic) < 2:
            topic = question.strip()
        
        user_state["pending_topic"] = topic
        user_state["stage"] = "awaiting_level"
        
        return jsonify({
            "answer": f"Great! I can help you find books on '{topic}'. To recommend the best books for you, what's your experience level?\n\n1. Beginner - Just starting out, need fundamentals and step-by-step guides\n2. Intermediate - Have some knowledge, looking to deepen understanding\n3. Advanced - Experienced, need in-depth technical material\n\nJust reply with: beginner, intermediate, or advanced",
            "books": [],
            "needs_clarification": True
        }), 200
    
    # Stage 3: User responded with level - Search and return results
    if user_state.get("stage") == "awaiting_level":
        detected_level = detect_level_from_text(question)
        
        if not detected_level:
            # Default to beginner if unclear
            detected_level = "beginner"
        
        user_state["level"] = detected_level
        user_state["stage"] = "complete"
        topic = user_state["pending_topic"]
        
        # Now search and get AI response
        return get_ai_recommendation(moodle_id, topic, detected_level)
    
    # Stage 4: Conversation complete - Ask level again for every new topic
    if user_state.get("stage") == "complete":
        topic = extract_topic(question)
        if not topic or len(topic) < 2:
            topic = question.strip()
        user_state["pending_topic"] = topic
        user_state["stage"] = "awaiting_level"
        return jsonify({
            "answer": f"Got it. You are looking for books on '{topic}'. What level do you want?\n\n1. Beginner\n2. Intermediate\n3. Advanced\n\nReply with beginner, intermediate, or advanced.",
            "books": [],
            "needs_clarification": True
        }), 200
    
    # Fallback
    topic = extract_topic(question)
    return get_ai_recommendation(moodle_id, topic if topic else question, "beginner")


def extract_topic(question):
    """
    Extract the main topic from user's question.
    Maps numeric menu selections to real topics.
    """
    # Map menu numbers to topics
    menu_topics = {
        "1": "artificial intelligence",
        "2": "web development",
        "3": "data structures",
        "4": "python programming",
        "5": "database management",
        "6": "cyber security",
        "7": "object oriented programming",
        "8": "computer networks"
    }
    q = question.strip().lower()
    if q in menu_topics:
        return menu_topics[q]
    # Remove common question words
    remove_words = [
        "i want", "i need", "looking for", "find me", "search for",
        "books on", "books about", "book on", "book about",
        "recommend", "suggest", "help me", "can you", "please",
        "learn", "study", "read", "any", "some", "good"
    ]
    topic = q
    for word in remove_words:
        topic = topic.replace(word, "")
    topic = " ".join(topic.split())
    return topic.strip()
# Health check endpoint for AI
@ai.route("/health", methods=["GET"])
def ai_health():
    return jsonify({"status": "ok", "message": "AI assistant route is running."}), 200


def needs_level_clarification(question):
    """
    Check if the question is about learning/educational content
    that would benefit from knowing the user's level.
    """
    learning_keywords = [
        "learn", "study", "tutorial", "guide", "course",
        "programming", "coding", "development", "understand",
        "teach", "education", "practice", "exercise"
    ]
    
    question_lower = question.lower()
    return any(kw in question_lower for kw in learning_keywords)


def detect_level_from_text(text):
    """Detect learner level from free text."""
    level_keywords = {
        "beginner": ["beginner", "basic", "new", "start", "starting", "newbie", "learning", "1"],
        "intermediate": ["intermediate", "mid", "medium", "some experience", "familiar", "2"],
        "advanced": ["advanced", "expert", "professional", "experienced", "deep", "3"],
    }
    text_lower = (text or "").lower()
    for level, keywords in level_keywords.items():
        if any(kw in text_lower for kw in keywords):
            return level
    return None


def build_quick_recommendation(topic, level, books, reason=None):
    """Fast deterministic recommendation text without external AI call."""
    intro = f"Here are the best available books on '{topic}' for {level} level:"
    reason_line = ""
    if reason:
        reason_line = f"\n(Using quick recommendations because AI service was slow: {reason})"

    top_books = books[:5]
    lines = []
    for idx, book in enumerate(top_books, start=1):
        lines.append(
            f"{idx}. {book['title']} - Good for {level} learners. Available copies: {book['available_copies']}."
        )
    return intro + reason_line + "\n\n" + "\n".join(lines)


def get_ai_recommendation(moodle_id, topic, level):
    """
    Search books and get AI-powered recommendation.
    """
    # Search for books (READ-ONLY)
    books = search_books(topic)
    
    # If no books found, return appropriate message
    if not books:
        return jsonify({
            "answer": f"I searched our library for '{topic}' but couldn't find any matching books currently available. Try using different keywords or check back later!",
            "books": [],
            "needs_clarification": False
        }), 200
    
    # Prepare book info for AI
    book_info = "\n".join([
        f"- {b['title']} (Publisher: {b['publisher']}, Available: {b['available_copies']} copies): {b['description'] or 'No description'}"
        for b in books[:10]  # Limit to 10 books for API call
    ])
    
    # Get OpenAI API key from config
    api_key = get_openai_key()
    if not api_key:
        # Fallback: Return books without AI explanation
        return jsonify({
            "answer": build_quick_recommendation(topic, level, books, reason="API key not configured"),
            "books": books,
            "needs_clarification": False,
            "note": "AI explanations unavailable - OpenAI API key not configured"
        }), 200
    
    try:
        # Initialize OpenRouter client (OpenAI-compatible API)
        client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        
        # Build user message
        user_message = f"""The student is looking for books about: "{topic}"
Their experience level: {level}

Here are the ONLY books available in our library (you MUST only recommend from this list):
{book_info}

Please recommend the most suitable books from this list and explain why each one is good for a {level} learner."""

        # Call OpenRouter API with free model
        response = client.chat.completions.create(
            model="liquid/lfm-2.5-1.2b-instruct:free",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            max_tokens=260,
            temperature=0.3,
            timeout=12
        )
        

        ai_answer = response.choices[0].message.content

        # Strict post-processing: Only allow book titles from search result
        allowed_titles = set(b['title'].strip().lower() for b in books)
        lines = ai_answer.splitlines()
        filtered_lines = []
        hallucinated_titles = []
        for line in lines:
            # Try to extract book title from numbered list (e.g., '1. Title')
            if line.strip() and line.lstrip()[0].isdigit() and '.' in line:
                # Extract after the first dot
                after_dot = line.split('.', 1)[1].strip()
                # Check if any allowed title is in this line (case-insensitive)
                found = False
                for t in allowed_titles:
                    if t in after_dot.lower():
                        found = True
                        break
                if found:
                    filtered_lines.append(line)
                else:
                    hallucinated_titles.append(after_dot)
            else:
                filtered_lines.append(line)

        if hallucinated_titles:
            filtered_lines.append("\n[Warning: Some recommended books were not found in our library and have been omitted. Please only consider the listed available books.]")

        strict_answer = "\n".join(filtered_lines)

        # Update conversation history
        conversation_state[moodle_id]["history"].append({
            "question": topic,
            "level": level,
            "books_found": len(books)
        })

        return jsonify({
            "answer": strict_answer,
            "books": books,
            "needs_clarification": False
        }), 200
        
    except Exception as e:
        # If external AI is slow/fails, return deterministic quick recommendations.
        return jsonify({
            "answer": build_quick_recommendation(topic, level, books, reason="temporary delay"),
            "books": books,
            "needs_clarification": False,
            "error": str(e)
        }), 200


@ai.route("/clear", methods=["POST"])
def clear_conversation():
    """
    POST /ai/clear
    Clear conversation state for current user.
    """
    moodle_id = verify_token()
    if not moodle_id:
        return jsonify({"message": "Authentication required"}), 401
    
    if moodle_id in conversation_state:
        del conversation_state[moodle_id]
    
    return jsonify({"message": "Conversation cleared"}), 200
