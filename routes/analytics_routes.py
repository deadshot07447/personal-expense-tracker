from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta
from database.connection import get_db_cursor
from routes.auth_routes import get_current_user_id, login_required

analytics_bp = Blueprint('analytics_bp', __name__)

def parse_iso_week(year_week_str):
    """
    Parses a string like '2026-W37' into (start_date_monday, end_date_sunday).
    """
    try:
        parts = year_week_str.upper().split('-W')
        year = int(parts[0])
        week = int(parts[1])
        # Find Monday of that ISO week
        first_day_of_year = date(year, 1, 4) # ISO week 1 always contains Jan 4
        start_of_week1 = first_day_of_year - timedelta(days=first_day_of_year.isoweekday() - 1)
        start_date = start_of_week1 + timedelta(weeks=week - 1)
        end_date = start_date + timedelta(days=6)
        return start_date, end_date
    except Exception:
        # Fallback to current week
        today = date.today()
        start_date = today - timedelta(days=today.weekday())
        end_date = start_date + timedelta(days=6)
        return start_date, end_date


@analytics_bp.route('/api/analytics/weekly-comparison', methods=['GET'])
@login_required
def get_weekly_comparison():
    """
    Compare expenditure between any two selected weeks.
    Returns day-of-week breakdown (Mon-Sun), category comparison, and net summary delta.
    """
    user_id = get_current_user_id()
    today = date.today()
    
    # Default to previous week vs current week if not provided
    current_mon = today - timedelta(days=today.weekday())
    prev_mon = current_mon - timedelta(days=7)
    
    default_week2 = f"{current_mon.year}-W{current_mon.isocalendar()[1]:02d}"
    default_week1 = f"{prev_mon.year}-W{prev_mon.isocalendar()[1]:02d}"

    week1_str = request.args.get('week1', default_week1)
    week2_str = request.args.get('week2', default_week2)

    w1_start, w1_end = parse_iso_week(week1_str)
    w2_start, w2_end = parse_iso_week(week2_str)

    try:
        with get_db_cursor() as cursor:
            # 1. Day-by-day queries for Week 1
            cursor.execute("""
                SELECT DAYOFWEEK(expense_date) as dow, COALESCE(SUM(amount), 0) as total
                FROM expenses
                WHERE user_id = %s AND expense_date BETWEEN %s AND %s
                GROUP BY DAYOFWEEK(expense_date)
            """, (user_id, w1_start.strftime('%Y-%m-%d'), w1_end.strftime('%Y-%m-%d')))
            # MySQL DAYOFWEEK: 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
            w1_days = {row['dow']: float(row['total']) for row in cursor.fetchall()}

            # Day-by-day queries for Week 2
            cursor.execute("""
                SELECT DAYOFWEEK(expense_date) as dow, COALESCE(SUM(amount), 0) as total
                FROM expenses
                WHERE user_id = %s AND expense_date BETWEEN %s AND %s
                GROUP BY DAYOFWEEK(expense_date)
            """, (user_id, w2_start.strftime('%Y-%m-%d'), w2_end.strftime('%Y-%m-%d')))
            w2_days = {row['dow']: float(row['total']) for row in cursor.fetchall()}

            # Standard Mon-Sun day ordering (dow in MySQL: Mon=2, Tue=3, Wed=4, Thu=5, Fri=6, Sat=7, Sun=1)
            day_order = [
                ('Mon', 2), ('Tue', 3), ('Wed', 4), ('Thu', 5), ('Fri', 6), ('Sat', 7), ('Sun', 1)
            ]
            daily_comparison = []
            for name, dow in day_order:
                daily_comparison.append({
                    'day': name,
                    'week1_amount': w1_days.get(dow, 0.0),
                    'week2_amount': w2_days.get(dow, 0.0)
                })

            # 2. Category comparison between the two weeks
            cursor.execute("""
                SELECT c.category_name, c.color,
                       COALESCE(SUM(CASE WHEN e.expense_date BETWEEN %s AND %s THEN e.amount ELSE 0 END), 0) as w1_amt,
                       COALESCE(SUM(CASE WHEN e.expense_date BETWEEN %s AND %s THEN e.amount ELSE 0 END), 0) as w2_amt
                FROM categories c
                LEFT JOIN expenses e ON c.category_id = e.category_id AND e.user_id = %s
                WHERE c.user_id IS NULL OR c.user_id = %s
                GROUP BY c.category_id, c.category_name, c.color
                HAVING (w1_amt > 0 OR w2_amt > 0)
                ORDER BY (w1_amt + w2_amt) DESC
            """, (w1_start.strftime('%Y-%m-%d'), w1_end.strftime('%Y-%m-%d'),
                  w2_start.strftime('%Y-%m-%d'), w2_end.strftime('%Y-%m-%d'),
                  user_id, user_id))

            category_comparison = []
            for row in cursor.fetchall():
                w1_amt = float(row['w1_amt'])
                w2_amt = float(row['w2_amt'])
                delta = w2_amt - w1_amt
                pct_change = round((delta / w1_amt * 100), 1) if w1_amt > 0 else (100.0 if w2_amt > 0 else 0.0)
                category_comparison.append({
                    'category': row['category_name'],
                    'color': row['color'] or '#4f46e5',
                    'week1_amount': w1_amt,
                    'week2_amount': w2_amt,
                    'delta': delta,
                    'pct_change': pct_change
                })

            w1_total = sum(d['week1_amount'] for d in daily_comparison)
            w2_total = sum(d['week2_amount'] for d in daily_comparison)
            total_diff = w2_total - w1_total
            total_pct_diff = round((total_diff / w1_total * 100), 1) if w1_total > 0 else (100.0 if w2_total > 0 else 0.0)

        return jsonify({
            'week1': {
                'code': week1_str,
                'label': f"Week {w1_start.strftime('%d %b')} – {w1_end.strftime('%d %b, %Y')}",
                'total': w1_total
            },
            'week2': {
                'code': week2_str,
                'label': f"Week {w2_start.strftime('%d %b')} – {w2_end.strftime('%d %b, %Y')}",
                'total': w2_total
            },
            'net_difference': total_diff,
            'percentage_difference': total_pct_diff,
            'daily_comparison': daily_comparison,
            'category_comparison': category_comparison
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to compute weekly comparison", "details": str(e)}), 500


@analytics_bp.route('/api/analytics/category-pie', methods=['GET'])
@login_required
def get_category_pie():
    """
    Returns category-wise spending distribution for Chart.js Pie/Donut rendering.
    Supports periods: 'daily', 'weekly', 'monthly', 'custom'.
    """
    user_id = get_current_user_id()
    period = request.args.get('period', 'monthly').lower()
    today = date.today()

    start_date = None
    end_date = None
    period_label = ""

    if period == 'daily':
        date_str = request.args.get('date', today.strftime('%Y-%m-%d'))
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            target_date = today
        start_date = target_date
        end_date = target_date
        period_label = f"Daily: {target_date.strftime('%a, %d %b %Y')}"

    elif period == 'weekly':
        week_str = request.args.get('week')
        if week_str:
            start_date, end_date = parse_iso_week(week_str)
        else:
            mon = today - timedelta(days=today.weekday())
            start_date = mon
            end_date = mon + timedelta(days=6)
        period_label = f"Week of {start_date.strftime('%d %b')} – {end_date.strftime('%d %b %Y')}"

    elif period == 'custom':
        start_str = request.args.get('start_date')
        end_str = request.args.get('end_date')
        try:
            start_date = datetime.strptime(start_str, '%Y-%m-%d').date() if start_str else today - timedelta(days=30)
            end_date = datetime.strptime(end_str, '%Y-%m-%d').date() if end_str else today
        except ValueError:
            start_date = today - timedelta(days=30)
            end_date = today
        period_label = f"Custom: {start_date.strftime('%d %b %Y')} – {end_date.strftime('%d %b %Y')}"

    else:  # 'monthly' is default
        month_str = request.args.get('month', today.strftime('%Y-%m'))
        try:
            dt = datetime.strptime(month_str, '%Y-%m')
            start_date = date(dt.year, dt.month, 1)
            # End of month
            if dt.month == 12:
                end_date = date(dt.year, 12, 31)
            else:
                next_month = date(dt.year, dt.month + 1, 1)
                end_date = next_month - timedelta(days=1)
            period_label = dt.strftime('%B %Y')
        except ValueError:
            start_date = date(today.year, today.month, 1)
            end_date = today
            period_label = today.strftime('%B %Y')

    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT c.category_id, c.category_name, c.color,
                       COALESCE(SUM(e.amount), 0) as total_amount,
                       COUNT(e.expense_id) as transaction_count
                FROM categories c
                JOIN expenses e ON c.category_id = e.category_id
                WHERE e.user_id = %s
                  AND e.expense_date BETWEEN %s AND %s
                GROUP BY c.category_id, c.category_name, c.color
                HAVING total_amount > 0
                ORDER BY total_amount DESC
            """, (user_id, start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')))

            rows = cursor.fetchall()
            total_spent = sum(float(r['total_amount']) for r in rows)

            categories = []
            for r in rows:
                amt = float(r['total_amount'])
                pct = round((amt / total_spent * 100), 1) if total_spent > 0 else 0
                categories.append({
                    'category_id': r['category_id'],
                    'category': r['category_name'],
                    'color': r['color'] or '#4f46e5',
                    'amount': amt,
                    'percentage': pct,
                    'count': r['transaction_count']
                })

        return jsonify({
            'period': period,
            'period_label': period_label,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
            'total_spent': total_spent,
            'categories': categories
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to generate pie chart data", "details": str(e)}), 500
