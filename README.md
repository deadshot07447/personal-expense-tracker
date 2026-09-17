# 💰 Personal Expense Tracker & Financial Analytics

A modern, secure, full-stack personal finance web application built with **Python (Flask)**, **MySQL 8.0**, **Bootstrap 5.3**, **Chart.js**, and **Vanilla JavaScript (ES6+)**.

The application helps individuals monitor daily expenses, set category-wise and overall monthly expenditure limits with threshold warnings, compare spending across different weeks, analyze category distributions using interactive pie charts, and view daily spending heatmaps on an expense calendar.

---

## 📖 Key Features

- 🔐 **Multi-User Authentication**: Individual user accounts with secure password hashing using **PBKDF2-SHA256** and server-side session management.
- 🏷️ **Isolated Custom Categories**: System-wide default categories plus user-exclusive custom categories with auto-assigned vibrant color badges.
- ⚠️ **Smart Budget Warning Engine**: Configure overall monthly limits and individual category limits. Real-time visual banners alert users when they reach 80% (Warning) or exceed 100% (Alert) of their budget.
- 📊 **Weekly Comparison Analytics**: Compare expenditure between any two ISO calendar weeks (e.g., Week A vs. Week B) with day-by-day (Mon–Sun) deltas and category-level breakdowns.
- 🥧 **Category Spending Distribution**: Interactive Chart.js pie / donut visualization with time-range filtering (Daily, Weekly, Monthly, Custom Range).
- 📅 **Expense Calendar Heatmap**: Monthly calendar grid visualizing daily spending levels with color heat indicators and a day-detail transaction view.
- 🎨 **Minimalist Design & CSS Constants**: Modular stylesheet powered by [`static/css/variables.css`](static/css/variables.css) for centralized design tokens, centered confirmation toast messages, and zero emojis (strictly vector SVG / Bootstrap Icons).

---

## 🏗️ Technical Architecture

The application adopts a decoupled **3-Tier Architecture**:

```text
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Tier                        │
│   HTML5 • Bootstrap 5.3.3 • Bootstrap Icons • Vanilla JS    │
│    variables.css (Design System) • Chart.js Data Visuals    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Asynchronous JSON HTTP / REST
┌──────────────────────────────▼──────────────────────────────┐
│                    Application Tier                         │
│   Python 3.10+ • Flask Application & Modular Blueprints     │
│   auth_bp • expense_bp • category_bp • budget_bp • analytics│
│   PBKDF2 Password Hashing • Session Middleware Auth Guards  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Parameterized Bind Queries (%s)
┌──────────────────────────────▼──────────────────────────────┐
│                       Data Tier                             │
│   MySQL 8.0 (InnoDB Engine, UTF8MB4 Character Set)          │
│   DBUtils.PooledDB Connection Pool • PyMySQL Driver         │
│   Tables: users • categories • expenses • budgets           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ SQL Injection Prevention & Security Standards

Security is enforced at the architectural level:

### 1. Zero SQL Injection by Parameterized Queries
**All database interactions throughout the entire codebase strictly use parameterized queries with bind variables (`%s`).**

Dynamic input values (such as IDs, amounts, dates, notes, and usernames) are **never** concatenated or formatted into SQL query strings (no `f"..."`, no `.format()`, no string concatenation). 

```python
# ✅ SAFE: Parameterized query using bind placeholders (%s)
cursor.execute(
    "INSERT INTO expenses (user_id, category_id, amount, expense_date, note) "
    "VALUES (%s, %s, %s, %s, %s)",
    (user_id, category_id, amount, expense_date, note)
)
```

The MySQL database driver compiles and parses the query template first, treating user-supplied values strictly as literal data rather than executable SQL syntax. This completely neutralizes SQL injection vectors (such as `' OR 1=1 --`, stacked queries, or subquery escapes).

### 2. Zero Dynamic DDL at Runtime
All database creation, table schema migrations, and initial seed data feeding are decoupled from application startup code. The Flask app connects strictly as a client to the pre-created schema without issuing dynamic `CREATE DATABASE` or `CREATE TABLE` commands.

### 3. Password Security
User passwords are never stored in plaintext. They are hashed using **PBKDF2 with SHA-256** (`werkzeug.security.generate_password_hash`) using 1,000,000 hash iterations and salt.

---

## 📂 Project Structure

```text
personal-expense-tracker/
│
├── database/
│   ├── connection.py         # MySQL connection pool (DBUtils.PooledDB) & cursor context manager
│   ├── schema.sql            # Clean DDL: Table definitions, constraints, and indexes
│   └── seed.sql              # Pre-seeded starter data (categories, users, budgets, 2026 expenses)
│
├── routes/
│   ├── auth_routes.py        # Sign-in, account registration, session status, logout
│   ├── expense_routes.py     # Expense CRUD, recent transactions, dashboard statistics
│   ├── category_routes.py    # System categories & user-exclusive custom categories
│   ├── budget_routes.py      # Overall & category monthly budget limits & live warnings
│   └── analytics_routes.py   # Weekly comparison logic & Chart.js category pie breakdown
│
├── static/
│   ├── css/
│   │   ├── variables.css     # CSS Custom Properties (:root design tokens & constants)
│   │   └── style.css         # Slim component styles, sidebar layout, toast animation
│   └── js/
│       └── app.js            # Client-side SPA controller, form validation, live charts
│
├── templates/
│   └── index.html            # Single Page Application HTML5 view
│
├── .env                      # Local environment configuration (DB credentials & SECRET_KEY)
├── .env.example              # Template showing required environment variables
├── .gitignore                # Git ignore file (virtualenvs, .env, __pycache__)
├── app.py                    # Flask server entry point & blueprint registration
├── config.py                 # Configuration class loading variables from .env
├── requirements.txt          # Python dependencies
└── README.md                 # Project documentation & setup instructions
```

---

## 🗄️ Database Schema & Data Feeding

The application relies on 4 normalized relational tables in MySQL 8.0:

| Table | Primary Key | Foreign Keys | Purpose |
| :--- | :--- | :--- | :--- |
| **`users`** | `user_id` | — | User accounts, emails, and hashed passwords |
| **`categories`** | `category_id` | `user_id` &rarr; `users` | System-wide (`NULL`) and user-exclusive custom categories |
| **`expenses`** | `expense_id` | `user_id` &rarr; `users`<br>`category_id` &rarr; `categories` | Financial transaction records with dates and notes |
| **`budgets`** | `budget_id` | `user_id` &rarr; `users`<br>`category_id` &rarr; `categories` | Monthly budget limits (`category_id IS NULL` = overall limit) |

---

## 🚀 Setup & Installation Guide

Before starting the Flask application, you will create the MySQL database, run the schema script, and feed the initial seed data.

### Step 1: Clone or Navigate to the Project
```bash
cd d:/personal-expense-tracker
```

### Step 2: Create Database, Schema, and Seed Data in MySQL

Open your MySQL terminal or MySQL Workbench:

```sql
-- 1. Create the database
CREATE DATABASE IF NOT EXISTS expense_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Now execute the schema and seed scripts using the MySQL command-line tool (or paste their contents into MySQL Workbench):

```bash
# 2. Run the Table Schema DDL
mysql -u root -p expense_tracker < database/schema.sql

# 3. Feed the Initial Seed Data (Categories, Demo Users, Budgets, 2026 Expenses)
mysql -u root -p expense_tracker < database/seed.sql
```

> **Pre-configured Demo Accounts:**
> - `aditya` / password: `aditya123`
> - `mayuri` / password: `mayuri123`
> - `demo` / password: `demo123`

---

### Step 3: Configure Environment Variables

Copy `.env.example` to `.env` and fill in your MySQL credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```ini
# Database Connection Details (MySQL 8.0)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=expense_tracker

# Flask Session Security Key
SECRET_KEY=replace_with_a_secure_random_hex_key
```

---

### Step 4: Set Up Python Virtual Environment & Dependencies

```bash
# Windows:
python -m venv venv
venv\Scripts\activate

# Linux / macOS:
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt
```

---

### Step 5: Start the Application

```bash
python app.py
```

The console will indicate that the connection pool has connected to your MySQL database:
```text
Initializing MySQL Database Connection Pool...
Successfully connected to MySQL database 'expense_tracker'.
Connected to MySQL database 'expense_tracker'.
 * Running on http://127.0.0.1:5000
```

Open your browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## ❓ Frequently Asked Questions (Viva / Technical Evaluation)

### Q1: Why did you choose MySQL 8.0 over SQLite or Oracle?
> **Answer:** MySQL 8.0 is a production-grade relational database management system supporting robust concurrency through the InnoDB engine, row-level locking, foreign key cascading, and performant date-time indexing. Compared to SQLite, it natively supports multi-user connection pooling. Compared to Oracle, it is lightweight, cross-platform, and widely accessible for open-source development.

### Q2: What is Connection Pooling and why use `DBUtils.PooledDB`?
> **Answer:** Establishing a new TCP handshake and authenticating a connection to MySQL on every single HTTP request adds significant latency (50–150ms per request). A **Connection Pool** pre-allocates a pool of active database connections (configured for min 2, max 10 in our project). Incoming requests borrow an available connection in $O(1)$ time and release it back to the pool in a `finally` block, minimizing overhead and preventing database connection exhaustion.

### Q3: How does the application guarantee complete protection against SQL Injection?
> **Answer:** The application strictly separates the query code from user-supplied data:
> 1. All SQL statements use static query strings with parameterized bind markers (`%s`).
> 2. All user variables are passed as a separate tuple into `cursor.execute(query, tuple_params)`.
> 3. The database driver escapes and typesets parameters as raw literals, meaning input containing SQL metacharacters like `'`, `"`, `;`, or `--` is never parsed as SQL code.

### Q4: How are categories kept exclusive to each user?
> **Answer:** In the `categories` table, the `user_id` column is `NULL` for standard system defaults (Food, Transport, etc.), and populated with the user's ID for custom categories. All category selection queries use:
> ```sql
> WHERE user_id IS NULL OR user_id = %s
> ```
> This allows users to see default categories plus their own private categories, while preventing other users from seeing or modifying them.

### Q5: How is the overall monthly budget distinguished from category budgets?
> **Answer:** Both live in the `budgets` table. When `category_id IS NULL`, the record represents the user's **overall monthly limit**. When `category_id` is an integer, it represents a **specific category's budget limit**. A unique constraint `UNIQUE (user_id, category_id)` ensures each user can have at most one overall budget and one budget per category.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
