from flask import Blueprint, request, jsonify
from datetime import datetime, date
from database.connection import get_db_cursor
from routes.auth_routes import get_current_user_id, login_required

expense_bp = Blueprint('expense_bp', __name__)

@expense_bp.route('/api/expenses', methods=['GET'])
@login_required
def get_expenses():
    """
    Fetch recent expenses for the logged-in user.
    """
    user_id = get_current_user_id()
    try:
        with get_db_cursor() as cursor:
            query = """
                SELECT e.expense_id, e.category_id, c.category_name, c.color,
                       e.amount, e.expense_date, e.note
                FROM expenses e
                JOIN categories c ON e.category_id = c.category_id
                WHERE e.user_id = %s
                ORDER BY e.expense_date DESC, e.expense_id DESC
                LIMIT 50
            """
            cursor.execute(query, (user_id,))
            rows = cursor.fetchall()
            
            expenses = []
            for row in rows:
                expenses.append({
                    'expense_id': row['expense_id'],
                    'category_id': row['category_id'],
                    'category_name': row['category_name'],
                    'color': row['color'] or '#4f46e5',
                    'amount': float(row['amount']),
                    'expense_date': row['expense_date'].strftime('%Y-%m-%d') if row['expense_date'] else None,
                    'note': row['note'] or ''
                })

        return jsonify(expenses), 200

    except Exception as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500


@expense_bp.route('/api/expenses', methods=['POST'])
@login_required
def add_expense():
    """
    Add a new expense for the logged-in user with live budget threshold warning checking.
    """
    user_id = get_current_user_id()
    data = request.get_json() or {}

    category_id = data.get('category_id')
    amount = data.get('amount')
    note = data.get('note', '').strip()
    expense_date_str = data.get('expense_date')

    if not category_id or amount is None:
        return jsonify({"error": "Category and amount are required."}), 400

    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({"error": "Amount must be greater than zero."}), 400
    except ValueError:
        return jsonify({"error": "Invalid amount format."}), 400

    if expense_date_str:
        try:
            expense_date = datetime.strptime(expense_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Expected YYYY-MM-DD."}), 400
    else:
        expense_date = date.today()

    try:
        with get_db_cursor(commit=True) as cursor:
            # 0. Ensure category is accessible to this user
            cursor.execute("SELECT category_id FROM categories WHERE category_id = %s AND (user_id IS NULL OR user_id = %s)", (category_id, user_id))
            if not cursor.fetchone():
                return jsonify({"error": "Invalid or inaccessible category."}), 400

            # 1. Insert expense
            insert_query = """
                INSERT INTO expenses (user_id, category_id, amount, expense_date, note)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(insert_query, (user_id, category_id, amount, expense_date.strftime('%Y-%m-%d'), note))
            new_expense_id = cursor.lastrowid

            # 2. Check for expenditure limit warnings triggered by this expense
            budget_warnings = []
            
            # Category budget check
            cursor.execute("""
                SELECT b.amount as limit_amt, c.category_name
                FROM budgets b
                JOIN categories c ON b.category_id = c.category_id
                WHERE b.user_id = %s AND b.category_id = %s
            """, (user_id, category_id))
            cat_budget = cursor.fetchone()

            if cat_budget:
                cat_limit = float(cat_budget['limit_amt'])
                cursor.execute("""
                    SELECT COALESCE(SUM(amount), 0) as total_cat
                    FROM expenses
                    WHERE user_id = %s AND category_id = %s
                      AND MONTH(expense_date) = MONTH(%s) AND YEAR(expense_date) = YEAR(%s)
                """, (user_id, category_id, expense_date.strftime('%Y-%m-%d'), expense_date.strftime('%Y-%m-%d')))
                new_cat_total = float(cursor.fetchone()['total_cat'])
                cat_pct = round((new_cat_total / cat_limit * 100), 1)

                if cat_pct >= 100:
                    budget_warnings.append({
                        'level': 'danger',
                        'message': f"Alert: You have exceeded your {cat_budget['category_name']} monthly budget! Spent: ₹{new_cat_total:,.0f} / ₹{cat_limit:,.0f} ({cat_pct}%)."
                    })
                elif cat_pct >= 80:
                    budget_warnings.append({
                        'level': 'warning',
                        'message': f"Warning: You have reached {cat_pct}% of your {cat_budget['category_name']} monthly budget (₹{new_cat_total:,.0f} / ₹{cat_limit:,.0f})."
                    })

            # Overall monthly budget check
            cursor.execute("SELECT amount as limit_amt FROM budgets WHERE user_id = %s AND category_id IS NULL", (user_id,))
            overall_budget = cursor.fetchone()
            if overall_budget:
                overall_limit = float(overall_budget['limit_amt'])
                cursor.execute("""
                    SELECT COALESCE(SUM(amount), 0) as total_month
                    FROM expenses
                    WHERE user_id = %s
                      AND MONTH(expense_date) = MONTH(%s) AND YEAR(expense_date) = YEAR(%s)
                """, (user_id, expense_date.strftime('%Y-%m-%d'), expense_date.strftime('%Y-%m-%d')))
                new_month_total = float(cursor.fetchone()['total_month'])
                month_pct = round((new_month_total / overall_limit * 100), 1)

                if month_pct >= 100:
                    budget_warnings.append({
                        'level': 'danger',
                        'message': f"Alert: Over overall monthly budget! Total spent: ₹{new_month_total:,.0f} / ₹{overall_limit:,.0f} ({month_pct}%)."
                    })
                elif month_pct >= 80:
                    budget_warnings.append({
                        'level': 'warning',
                        'message': f"Warning: You have consumed {month_pct}% of your total monthly budget (₹{new_month_total:,.0f} / ₹{overall_limit:,.0f})."
                    })

        return jsonify({
            "message": "Expense added successfully",
            "expense_id": new_expense_id,
            "budget_warnings": budget_warnings
        }), 201

    except Exception as e:
        return jsonify({"error": "Failed to add expense", "details": str(e)}), 500


@expense_bp.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
@login_required
def delete_expense(expense_id):
    """
    Delete an expense belonging to the logged-in user.
    """
    user_id = get_current_user_id()
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM expenses WHERE expense_id = %s AND user_id = %s", (expense_id, user_id))
            if cursor.rowcount == 0:
                return jsonify({"error": "Expense not found or unauthorized"}), 404

        return jsonify({"message": "Expense deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": "Failed to delete expense", "details": str(e)}), 500


@expense_bp.route('/api/dashboard', methods=['GET'])
@login_required
def get_dashboard_stats():
    """
    Returns high-level dashboard metrics for the user.
    """
    user_id = get_current_user_id()
    try:
        with get_db_cursor() as cursor:
            stats = {
                "total_spend": 0.0,
                "monthly_spend": 0.0,
                "yearly_spend": 0.0,
                "category_spending": [],
                "monthly_spending_trend": []
            }

            # 1. Total lifetime spend
            cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = %s", (user_id,))
            stats["total_spend"] = float(cursor.fetchone()['total'])

            # 2. Monthly spend (current month)
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) as monthly
                FROM expenses
                WHERE user_id = %s
                  AND MONTH(expense_date) = MONTH(CURDATE())
                  AND YEAR(expense_date) = YEAR(CURDATE())
            """, (user_id,))
            stats["monthly_spend"] = float(cursor.fetchone()['monthly'])

            # 3. Yearly spend (current year)
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) as yearly
                FROM expenses
                WHERE user_id = %s
                  AND YEAR(expense_date) = YEAR(CURDATE())
            """, (user_id,))
            stats["yearly_spend"] = float(cursor.fetchone()['yearly'])

            # 4. Category-wise spending
            cursor.execute("""
                SELECT c.category_name, c.color, COALESCE(SUM(e.amount), 0) as total_amount
                FROM categories c
                JOIN expenses e ON c.category_id = e.category_id
                WHERE e.user_id = %s
                GROUP BY c.category_id, c.category_name, c.color
                HAVING total_amount > 0
                ORDER BY total_amount DESC
            """, (user_id,))
            for row in cursor.fetchall():
                stats["category_spending"].append({
                    "category": row['category_name'],
                    "color": row['color'] or '#4f46e5',
                    "amount": float(row['total_amount'])
                })

            # 5. Monthly spending trend for current year
            cursor.execute("""
                SELECT 
                    DATE_FORMAT(expense_date, '%%b') as month_name,
                    MONTH(expense_date) as month_num,
                    SUM(amount) as total
                FROM expenses
                WHERE user_id = %s AND YEAR(expense_date) = YEAR(CURDATE())
                GROUP BY DATE_FORMAT(expense_date, '%%b'), MONTH(expense_date)
                ORDER BY month_num ASC
            """, (user_id,))
            for row in cursor.fetchall():
                stats["monthly_spending_trend"].append({
                    "month": row['month_name'],
                    "amount": float(row['total'])
                })

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({"error": "Failed to fetch dashboard metrics", "details": str(e)}), 500


@expense_bp.route('/api/expenses/calendar', methods=['GET'])
@login_required
def get_expense_calendar():
    """
    Returns monthly calendar view of expenses:
    Aggregated day-by-day totals, transaction counts, heat intensity level (0-4),
    and day items for modal drilldown.
    """
    user_id = get_current_user_id()
    today = date.today()
    
    year = request.args.get('year', default=today.year, type=int)
    month = request.args.get('month', default=today.month, type=int)

    if month < 1 or month > 12:
        month = today.month
    if year < 2000 or year > 2100:
        year = today.year

    try:
        with get_db_cursor() as cursor:
            # Query all expenses for the target month
            cursor.execute("""
                SELECT e.expense_id, e.category_id, c.category_name, c.color,
                       e.amount, e.expense_date, e.note, DAY(e.expense_date) as day_num
                FROM expenses e
                JOIN categories c ON e.category_id = c.category_id
                WHERE e.user_id = %s
                  AND YEAR(e.expense_date) = %s
                  AND MONTH(e.expense_date) = %s
                ORDER BY e.expense_date ASC, e.expense_id DESC
            """, (user_id, year, month))
            rows = cursor.fetchall()

            # Group items by day
            days_map = {}
            max_daily_spend = 0.0

            for r in rows:
                d = r['day_num']
                amt = float(r['amount'])
                if d not in days_map:
                    days_map[d] = {
                        'day': d,
                        'date': r['expense_date'].strftime('%Y-%m-%d'),
                        'total_amount': 0.0,
                        'count': 0,
                        'items': []
                    }
                days_map[d]['total_amount'] += amt
                days_map[d]['count'] += 1
                days_map[d]['items'].append({
                    'expense_id': r['expense_id'],
                    'category_id': r['category_id'],
                    'category_name': r['category_name'],
                    'color': r['color'] or '#4f46e5',
                    'amount': amt,
                    'note': r['note'] or '',
                    'expense_date': r['expense_date'].strftime('%Y-%m-%d')
                })

            for d, data in days_map.items():
                if data['total_amount'] > max_daily_spend:
                    max_daily_spend = data['total_amount']

            # Assign heat levels 1-4 based on relative daily spend
            for d, data in days_map.items():
                if max_daily_spend > 0:
                    ratio = data['total_amount'] / max_daily_spend
                    if ratio > 0.75:
                        data['heat_level'] = 4
                    elif ratio > 0.45:
                        data['heat_level'] = 3
                    elif ratio > 0.2:
                        data['heat_level'] = 2
                    else:
                        data['heat_level'] = 1
                else:
                    data['heat_level'] = 0

            # Month display name
            month_dt = date(year, month, 1)
            month_name = month_dt.strftime('%B')

            return jsonify({
                'year': year,
                'month': month,
                'month_name': month_name,
                'max_daily_spend': max_daily_spend,
                'days': days_map
            }), 200

    except Exception as e:
        return jsonify({"error": "Failed to load calendar data", "details": str(e)}), 500
