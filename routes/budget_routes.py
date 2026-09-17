from flask import Blueprint, request, jsonify
from database.connection import get_db_cursor
from routes.auth_routes import get_current_user_id, login_required

budget_bp = Blueprint('budget_bp', __name__)

@budget_bp.route('/api/budgets', methods=['GET'])
@login_required
def get_budgets():
    """
    Returns budget limits and current month consumption for the logged-in user,
    including warning alerts (warning at >=80%, danger at >=100%).
    """
    user_id = get_current_user_id()
    try:
        with get_db_cursor() as cursor:
            # 1. Fetch current month total expenditure
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) as total_monthly_spend
                FROM expenses
                WHERE user_id = %s
                  AND MONTH(expense_date) = MONTH(CURDATE())
                  AND YEAR(expense_date) = YEAR(CURDATE())
            """, (user_id,))
            total_monthly_spend = float(cursor.fetchone()['total_monthly_spend'])

            # 2. Fetch current month spend grouped by category
            cursor.execute("""
                SELECT category_id, COALESCE(SUM(amount), 0) as cat_spend
                FROM expenses
                WHERE user_id = %s
                  AND MONTH(expense_date) = MONTH(CURDATE())
                  AND YEAR(expense_date) = YEAR(CURDATE())
                GROUP BY category_id
            """, (user_id,))
            cat_spend_map = {row['category_id']: float(row['cat_spend']) for row in cursor.fetchall()}

            # 3. Fetch user's configured budgets
            cursor.execute("""
                SELECT b.budget_id, b.category_id, b.amount, b.period,
                       c.category_name, c.color, c.icon
                FROM budgets b
                LEFT JOIN categories c ON b.category_id = c.category_id
                WHERE b.user_id = %s
            """, (user_id,))
            budget_rows = cursor.fetchall()

            overall_budget = None
            category_budgets = []
            alerts = []

            for b in budget_rows:
                limit_amt = float(b['amount'])
                if b['category_id'] is None:
                    # Overall monthly limit
                    spent = total_monthly_spend
                    pct = round((spent / limit_amt * 100), 1) if limit_amt > 0 else 0
                    remaining = max(0.0, limit_amt - spent)
                    
                    status = 'ok'
                    if pct >= 100:
                        status = 'danger'
                        alerts.append({
                            'id': f"budget-{b['budget_id']}",
                            'level': 'danger',
                            'title': 'Overall Budget Exceeded!',
                            'message': f"You have exceeded your total monthly budget of ₹{limit_amt:,.0f}! Total spent: ₹{spent:,.0f} ({pct}%)."
                        })
                    elif pct >= 80:
                        status = 'warning'
                        alerts.append({
                            'id': f"budget-{b['budget_id']}",
                            'level': 'warning',
                            'title': 'Monthly Budget Warning',
                            'message': f"You have spent {pct}% of your monthly budget (₹{spent:,.0f} / ₹{limit_amt:,.0f})."
                        })

                    overall_budget = {
                        'budget_id': b['budget_id'],
                        'limit_amount': limit_amt,
                        'spent_amount': spent,
                        'percentage': pct,
                        'remaining': remaining,
                        'status': status
                    }
                else:
                    # Category-specific limit
                    cat_id = b['category_id']
                    cat_name = b['category_name'] or 'Unknown Category'
                    spent = cat_spend_map.get(cat_id, 0.0)
                    pct = round((spent / limit_amt * 100), 1) if limit_amt > 0 else 0
                    remaining = max(0.0, limit_amt - spent)

                    status = 'ok'
                    if pct >= 100:
                        status = 'danger'
                        alerts.append({
                            'id': f"budget-{b['budget_id']}",
                            'level': 'danger',
                            'title': f"{cat_name} Limit Exceeded!",
                            'message': f"You have spent ₹{spent:,.0f} out of your ₹{limit_amt:,.0f} budget for {cat_name} ({pct}%)."
                        })
                    elif pct >= 80:
                        status = 'warning'
                        alerts.append({
                            'id': f"budget-{b['budget_id']}",
                            'level': 'warning',
                            'title': f"{cat_name} Budget Warning",
                            'message': f"You've consumed {pct}% of your {cat_name} budget (₹{spent:,.0f} / ₹{limit_amt:,.0f})."
                        })

                    category_budgets.append({
                        'budget_id': b['budget_id'],
                        'category_id': cat_id,
                        'category_name': cat_name,
                        'color': b['color'] or '#4f46e5',
                        'limit_amount': limit_amt,
                        'spent_amount': spent,
                        'percentage': pct,
                        'remaining': remaining,
                        'status': status
                    })

        return jsonify({
            'overall_budget': overall_budget,
            'category_budgets': category_budgets,
            'alerts': alerts
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to fetch budgets", "details": str(e)}), 500


@budget_bp.route('/api/budgets', methods=['POST'])
@login_required
def set_budget():
    """
    Set or update a budget limit (overall monthly or for a specific category).
    Payload: {"category_id": null or int, "amount": float}
    """
    user_id = get_current_user_id()
    data = request.get_json() or {}
    category_id = data.get('category_id')
    amount = data.get('amount')

    if amount is None:
        return jsonify({"error": "Budget amount is required."}), 400

    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({"error": "Budget amount must be greater than zero."}), 400
    except ValueError:
        return jsonify({"error": "Invalid budget amount format."}), 400

    try:
        with get_db_cursor(commit=True) as cursor:
            # If category_id is provided, verify it exists and is accessible
            if category_id is not None:
                category_id = int(category_id)
                cursor.execute("""
                    SELECT category_id FROM categories 
                    WHERE category_id = %s AND (user_id IS NULL OR user_id = %s)
                """, (category_id, user_id))
                if not cursor.fetchone():
                    return jsonify({"error": "Invalid category specified."}), 404

            # Insert or update
            if category_id is None:
                cursor.execute("""
                    SELECT budget_id FROM budgets WHERE user_id = %s AND category_id IS NULL
                """, (user_id,))
                existing = cursor.fetchone()
                if existing:
                    cursor.execute("""
                        UPDATE budgets SET amount = %s WHERE budget_id = %s
                    """, (amount, existing['budget_id']))
                else:
                    cursor.execute("""
                        INSERT INTO budgets (user_id, category_id, amount, period)
                        VALUES (%s, NULL, %s, 'MONTHLY')
                    """, (user_id, amount))
            else:
                query = """
                    INSERT INTO budgets (user_id, category_id, amount, period)
                    VALUES (%s, %s, %s, 'MONTHLY')
                    ON DUPLICATE KEY UPDATE amount = VALUES(amount)
                """
                cursor.execute(query, (user_id, category_id, amount))

        return jsonify({"message": "Budget limit successfully configured."}), 200

    except Exception as e:
        return jsonify({"error": "Failed to save budget", "details": str(e)}), 500


@budget_bp.route('/api/budgets/<int:budget_id>', methods=['DELETE'])
@login_required
def delete_budget(budget_id):
    """
    Remove a configured budget limit.
    """
    user_id = get_current_user_id()
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM budgets WHERE budget_id = %s AND user_id = %s", (budget_id, user_id))
            if cursor.rowcount == 0:
                return jsonify({"error": "Budget limit not found."}), 404

        return jsonify({"message": "Budget limit removed."}), 200
    except Exception as e:
        return jsonify({"error": "Failed to remove budget", "details": str(e)}), 500
