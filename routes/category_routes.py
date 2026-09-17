from flask import Blueprint, request, jsonify
from database.connection import get_db_cursor
from routes.auth_routes import get_current_user_id, login_required

category_bp = Blueprint('category_bp', __name__)

@category_bp.route('/api/categories', methods=['GET'])
@login_required
def get_categories():
    """
    Fetch all categories accessible to the current user:
    Default system categories (user_id IS NULL) + user's custom categories.
    """
    user_id = get_current_user_id()
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT category_id, user_id, category_name, color, icon
                FROM categories
                WHERE user_id IS NULL OR user_id = %s
                ORDER BY (user_id IS NOT NULL), category_id ASC
            """, (user_id,))
            
            rows = cursor.fetchall()
            categories = []
            for row in rows:
                categories.append({
                    'category_id': row['category_id'],
                    'category_name': row['category_name'],
                    'color': row['color'] or '#4f46e5',
                    'icon': row['icon'] or 'tag',
                    'is_custom': row['user_id'] is not None
                })

        return jsonify(categories), 200

    except Exception as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500


@category_bp.route('/api/categories', methods=['POST'])
@login_required
def add_category():
    """
    Create a new custom category for the logged-in user.
    """
    user_id = get_current_user_id()
    data = request.get_json() or {}
    category_name = (data.get('category_name') or '').strip()
    PALETTE = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f97316']
    color = (data.get('color') or '').strip()
    if not color:
        color = PALETTE[abs(hash(category_name)) % len(PALETTE)]
    icon = (data.get('icon') or 'tag').strip()

    if not category_name:
        return jsonify({"error": "Category name is required."}), 400
    if len(category_name) > 50:
        return jsonify({"error": "Category name must be 50 characters or less."}), 400

    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if category with this name already exists for this user or system-wide
            cursor.execute("""
                SELECT category_id FROM categories 
                WHERE (user_id IS NULL OR user_id = %s) AND LOWER(category_name) = LOWER(%s)
            """, (user_id, category_name))
            if cursor.fetchone():
                return jsonify({"error": f"Category '{category_name}' already exists."}), 409

            cursor.execute("""
                INSERT INTO categories (user_id, category_name, color, icon)
                VALUES (%s, %s, %s, %s)
            """, (user_id, category_name, color, icon))
            
            new_id = cursor.lastrowid

        return jsonify({
            "message": "Category added successfully",
            "category": {
                "category_id": new_id,
                "category_name": category_name,
                "color": color,
                "icon": icon,
                "is_custom": True
            }
        }), 201

    except Exception as e:
        return jsonify({"error": "Failed to create category", "details": str(e)}), 500


@category_bp.route('/api/categories/<int:category_id>', methods=['DELETE'])
@login_required
def delete_category(category_id):
    """
    Delete a custom category owned by the user.
    System categories cannot be deleted.
    Categories with associated expenses cannot be deleted without reassigning.
    """
    user_id = get_current_user_id()
    try:
        with get_db_cursor(commit=True) as cursor:
            # Verify category belongs to current user
            cursor.execute("SELECT user_id, category_name FROM categories WHERE category_id = %s", (category_id,))
            cat = cursor.fetchone()
            if not cat:
                return jsonify({"error": "Category not found."}), 404
            if cat['user_id'] is None:
                return jsonify({"error": "System default categories cannot be deleted."}), 403
            if cat['user_id'] != user_id:
                return jsonify({"error": "Unauthorized to delete this category."}), 403

            # Check if active expenses exist for this category
            cursor.execute("SELECT COUNT(*) as exp_count FROM expenses WHERE category_id = %s", (category_id,))
            count = cursor.fetchone()['exp_count']
            if count > 0:
                return jsonify({
                    "error": f"Cannot delete category '{cat['category_name']}' because {count} expense record(s) are linked to it."
                }), 400

            cursor.execute("DELETE FROM categories WHERE category_id = %s", (category_id,))

        return jsonify({"message": f"Category '{cat['category_name']}' deleted successfully."}), 200

    except Exception as e:
        return jsonify({"error": "Failed to delete category", "details": str(e)}), 500
