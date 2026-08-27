from flask import Blueprint, jsonify
from database.connection import get_connection
import oracledb

# Create a Flask Blueprint for category routes
category_bp = Blueprint('category_bp', __name__)

@category_bp.route('/api/categories', methods=['GET'])
def get_categories():
    """
    Fetch all categories from the database.
    Used to populate the category dropdown in the frontend.
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # We query all categories, ordered by ID
        cursor.execute("SELECT category_id, category_name FROM CATEGORIES ORDER BY category_id")
        
        categories = []
        # cursor.fetchall() returns a list of tuples like [(1, 'Food'), (2, 'Transport')]
        for row in cursor.fetchall():
            categories.append({
                'category_id': row[0],
                'category_name': row[1]
            })
            
        return jsonify(categories), 200
        
    except oracledb.Error as e:
        # If a database error occurs, return a 500 status code
        error_msg = str(e)
        return jsonify({"error": "Database error", "details": error_msg}), 500
        
    finally:
        # Always ensure the connection is closed (returned to the pool)
        # even if an error occurred.
        if conn:
            conn.close()
