from flask import Blueprint, request, jsonify
from database.connection import get_connection
import oracledb

# Create a Blueprint for expense-related routes
expense_bp = Blueprint('expense_bp', __name__)

@expense_bp.route('/api/expenses', methods=['GET'])
def get_expenses():
    """
    Fetch recent expenses, joined with category information.
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Use a JOIN to get the category name along with the expense details
        query = """
            SELECT e.expense_id, e.category_id, c.category_name, e.amount, e.expense_date, e.note
            FROM EXPENSES e
            JOIN CATEGORIES c ON e.category_id = c.category_id
            ORDER BY e.expense_date DESC, e.expense_id DESC
            FETCH FIRST 10 ROWS ONLY
        """
        cursor.execute(query)
        
        expenses = []
        for row in cursor.fetchall():
            expenses.append({
                'expense_id': row[0],
                'category_id': row[1],
                'category_name': row[2],
                'amount': float(row[3]), # Ensure decimal amounts are serialized correctly
                'expense_date': row[4].strftime('%Y-%m-%d') if row[4] else None,
                'note': row[5]
            })
            
        return jsonify(expenses), 200
    except oracledb.Error as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@expense_bp.route('/api/expenses', methods=['POST'])
def add_expense():
    """
    Add a new expense.
    """
    data = request.get_json()
    
    # Simple validation
    category_id = data.get('category_id')
    amount = data.get('amount')
    note = data.get('note', '')
    
    if not category_id or amount is None:
        return jsonify({"error": "Category and amount are required."}), 400
        
    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({"error": "Amount must be greater than zero."}), 400
    except ValueError:
        return jsonify({"error": "Invalid amount format."}), 400
        
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # ALWAYS use parameterized queries (using :1, :2, :3 in Oracle)
        # to prevent SQL injection attacks.
        insert_query = """
            INSERT INTO EXPENSES (category_id, amount, note)
            VALUES (:1, :2, :3)
        """
        cursor.execute(insert_query, (category_id, amount, note))
        
        # Commit the transaction so the data is permanently saved
        conn.commit()
        
        return jsonify({"message": "Expense added successfully"}), 201
        
    except oracledb.Error as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@expense_bp.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    """
    Delete an expense by its ID.
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        delete_query = "DELETE FROM EXPENSES WHERE expense_id = :1"
        cursor.execute(delete_query, (expense_id,))
        
        # Check if any row was actually deleted
        if cursor.rowcount == 0:
            return jsonify({"error": "Expense not found"}), 404
            
        conn.commit()
        return jsonify({"message": "Expense deleted successfully"}), 200
        
    except oracledb.Error as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@expense_bp.route('/api/dashboard', methods=['GET'])
def get_dashboard_stats():
    """
    Returns dashboard statistics: total spend, monthly spend, yearly spend, 
    and category-wise spending. We use Oracle SQL aggregation features here.
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        stats = {
            "total_spend": 0,
            "monthly_spend": 0,
            "yearly_spend": 0,
            "category_spending": [],
            "monthly_spending_trend": []
        }
        
        # 1. Total Spend
        cursor.execute("SELECT NVL(SUM(amount), 0) FROM EXPENSES")
        stats["total_spend"] = float(cursor.fetchone()[0])
        
        # 2. Monthly Spend (Current Month)
        monthly_query = """
            SELECT NVL(SUM(amount), 0) FROM EXPENSES 
            WHERE EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM SYSDATE)
            AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM SYSDATE)
        """
        cursor.execute(monthly_query)
        stats["monthly_spend"] = float(cursor.fetchone()[0])
        
        # 3. Yearly Spend (Current Year)
        yearly_query = """
            SELECT NVL(SUM(amount), 0) FROM EXPENSES 
            WHERE EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM SYSDATE)
        """
        cursor.execute(yearly_query)
        stats["yearly_spend"] = float(cursor.fetchone()[0])
        
        # 4. Category-wise spending
        # We group by category name and sum the amounts
        category_query = """
            SELECT c.category_name, NVL(SUM(e.amount), 0) as total_amount
            FROM CATEGORIES c
            LEFT JOIN EXPENSES e ON c.category_id = e.category_id
            GROUP BY c.category_name
            HAVING SUM(e.amount) > 0
            ORDER BY total_amount DESC
        """
        cursor.execute(category_query)
        for row in cursor.fetchall():
            stats["category_spending"].append({
                "category": row[0],
                "amount": float(row[1])
            })
            
        # 5. Monthly spending trend (for horizontal bars)
        # Groups spending by month for the current year
        trend_query = """
            SELECT 
                TO_CHAR(expense_date, 'MON') as month_name,
                EXTRACT(MONTH FROM expense_date) as month_num,
                SUM(amount) as total
            FROM EXPENSES
            WHERE EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM SYSDATE)
            GROUP BY TO_CHAR(expense_date, 'MON'), EXTRACT(MONTH FROM expense_date)
            ORDER BY month_num
        """
        cursor.execute(trend_query)
        for row in cursor.fetchall():
             stats["monthly_spending_trend"].append({
                "month": row[0],
                "amount": float(row[2])
            })
            
        return jsonify(stats), 200
        
    except oracledb.Error as e:
        print("Database error in dashboard:", e)
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()
