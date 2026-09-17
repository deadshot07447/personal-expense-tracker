from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from database.connection import get_db_cursor

auth_bp = Blueprint('auth_bp', __name__)

def login_required(f):
    """
    Decorator to ensure user is logged in before accessing protected API endpoints.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Authentication required", "authenticated": False}), 401
        return f(*args, **kwargs)
    return decorated_function


def get_current_user_id():
    """
    Returns the current logged-in user_id from Flask session.
    Returns None if the user is unauthenticated.
    """
    return session.get('user_id')


@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not username or len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters long."}), 400
    if not email or '@' not in email:
        return jsonify({"error": "A valid email address is required."}), 400
    if not password or len(password) < 4:
        return jsonify({"error": "Password must be at least 4 characters long."}), 400

    password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    try:
        with get_db_cursor(commit=True) as cursor:
            # Check for existing username or email
            cursor.execute("SELECT user_id FROM users WHERE username = %s OR email = %s", (username, email))
            existing = cursor.fetchone()
            if existing:
                return jsonify({"error": "Username or email is already taken."}), 409

            cursor.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
                (username, email, password_hash)
            )
            user_id = cursor.lastrowid

            # Set a starting overall monthly budget for the new user
            cursor.execute(
                "INSERT INTO budgets (user_id, category_id, amount, period) VALUES (%s, NULL, 25000.00, 'MONTHLY')",
                (user_id,)
            )

        session['user_id'] = user_id
        session['username'] = username
        session.permanent = True

        return jsonify({
            "message": "Registration successful",
            "user": {
                "user_id": user_id,
                "username": username,
                "email": email
            }
        }), 201

    except Exception as e:
        return jsonify({"error": "Failed to register user", "details": str(e)}), 500


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    identifier = data.get('username', '').strip()
    password = data.get('password', '')

    if not identifier or not password:
        return jsonify({"error": "Username/email and password are required."}), 400

    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT user_id, username, email, password_hash FROM users WHERE username = %s OR email = %s",
                (identifier, identifier.lower())
            )
            user = cursor.fetchone()

            if not user or not check_password_hash(user['password_hash'], password):
                return jsonify({"error": "Invalid username or password."}), 401

        session['user_id'] = user['user_id']
        session['username'] = user['username']
        session.permanent = True

        return jsonify({
            "message": "Login successful",
            "user": {
                "user_id": user['user_id'],
                "username": user['username'],
                "email": user['email']
            }
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to log in", "details": str(e)}), 500


@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Successfully logged out"}), 200


@auth_bp.route('/api/auth/me', methods=['GET'])
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"authenticated": False}), 200

    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT user_id, username, email FROM users WHERE user_id = %s", (user_id,))
            user = cursor.fetchone()
            if not user:
                session.clear()
                return jsonify({"authenticated": False}), 200

            return jsonify({
                "authenticated": True,
                "user": user
            }), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch user state", "details": str(e)}), 500
