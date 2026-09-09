# 💰 Personal Expense Tracker

A beginner-friendly, full-stack Single Page Application (SPA) designed to monitor, categorize, and manage personal daily expenditures. Built with **Python (Flask)**, an **Oracle Database**, **Vanilla JavaScript (ES6+)**, **HTML5**, and **CSS3**.

---

## 📖 Introduction

Managing personal finances is one of the most essential life skills, yet tracking day-to-day outlays through traditional notebooks or complicated spreadsheets is tedious, error-prone, and unsustainable. 

The **Personal Expense Tracker** solves this problem by offering an intuitive, lightweight, and responsive web application. It allows individuals to record expenses in real time, classify expenditures into meaningful categories (e.g., Food, Transport, Bills, Shopping), and instantly view key financial metrics such as total lifetime spend, current month outlay, current year expenditure, and monthly spending patterns.

By adopting a decoupled **3-Tier Architecture** and asynchronous Single Page Application (SPA) design, the tracker provides instantaneous user interactions without sluggish page reloads, backed by the reliability and relational integrity of an **Oracle Database**.

---

## 🎯 What I Am Performing in the Project

In this project, I am developing and implementing an end-to-end full-stack web application from scratch. The core engineering tasks performed include:

1. **Relational Database Modeling & Schema Engineering**:
   - Designed normalized relational tables (`CATEGORIES` and `EXPENSES`) with identity columns for auto-incrementing primary keys.
   - Enforced referential integrity via Foreign Key constraints (`fk_expense_category`) between expenses and categories.
   - Enforced domain-level integrity rules, such as `CHECK (amount > 0)` and `NOT NULL` constraints, ensuring invalid data cannot enter the system.

2. **Database Connection Pooling**:
   - Implemented efficient database connection pooling using `python-oracledb` (`oracledb.create_pool`).
   - Managed connection acquisition and deterministic release (`try...finally`) to prevent connection leaks and optimize performance when handling multiple requests.

3. **RESTful API Backend Architecture**:
   - Structured backend logic using **Flask Blueprints** (`category_bp` and `expense_bp`) for clean separation of concerns.
   - Built REST endpoints supporting standard HTTP methods (`GET`, `POST`, `DELETE`) with uniform JSON request and response payloads, along with standard HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`).

4. **Robust Security & SQL Injection Prevention**:
   - Parameterized all database operations using Oracle bind variables (`:1, :2, :3`) to completely isolate query structure from user inputs, preventing SQL injection vulnerabilities.

5. **Analytical SQL Query Formulation**:
   - Crafted analytical aggregation queries using SQL functions (`SUM`, `NVL`, `EXTRACT(MONTH FROM ...)`, `EXTRACT(YEAR FROM ...)`, and `GROUP BY`) to compute real-time summary statistics for the live dashboard.

6. **Asynchronous Single Page Application (SPA) Frontend**:
   - Created a dynamic client using Vanilla JavaScript and the modern `fetch()` API.
   - Handled form validation, live DOM manipulation, and dynamic relative bar calculation for monthly trends without heavy third-party frontend frameworks.
   - Implemented error handling and non-blocking notification banners for a smooth, beginner-friendly user experience.

---

## 📂 Project Folder Structure & File Information

The project follows a clean, modular structure separating backend logic, database management, static assets, and templates:

```text
personal-expense-tracker/
│
├── database/
│   └── connection.py       # Oracle Database connection pool configuration & accessor
│
├── routes/
│   ├── category_routes.py  # REST API endpoints for categories (/api/categories)
│   └── expense_routes.py   # REST API endpoints for expenses & dashboard metrics
│
├── static/
│   ├── css/
│   │   └── style.css       # Custom styles, responsive grid, cards, and UI animations
│   └── js/
│       └── app.js          # Dynamic frontend logic, fetch calls, and DOM rendering
│
├── templates/
│   └── index.html          # SPA single-page HTML5 layout
│
├── .env                    # Local environment variables (DB credentials - git-ignored)
├── .env.example            # Template showing required environment variables
├── .gitignore              # Files and directories ignored by Git version control
├── app.py                  # Main application entry point; initializes server and pool
├── config.py               # Application configuration loader using python-dotenv
├── requirements.txt        # Python dependency manifest (Flask, oracledb, python-dotenv)
└── README.md               # Project documentation and local setup guide
```

### 📄 Detailed File Descriptions

| File / Directory | Category | Description & Responsibilities |
| :--- | :--- | :--- |
| **`app.py`** | Application Entry | The primary Flask server script. Registers route blueprints, initializes the Oracle connection pool during startup, serves the base `index.html` template, and launches the local development server. |
| **`config.py`** | Configuration | Reads environment variables from the `.env` file using `python-dotenv`. Exposes the `Config` class containing database credentials (`DB_USER`, `DB_PASSWORD`, `DB_DSN`). |
| **`database/connection.py`** | Database Layer | Manages the Oracle Database connection pool (`oracledb.create_pool`). Defines `init_pool()` and `get_connection()` to safely provide connections to API routes and return them when finished. |
| **`routes/category_routes.py`** | API Layer | Flask Blueprint (`category_bp`) handling category operations. Provides `GET /api/categories` to return all category IDs and names as JSON for dropdown population. |
| **`routes/expense_routes.py`** | API Layer | Flask Blueprint (`expense_bp`) handling expenses. Implements `GET /api/expenses` (recent 10 expenses), `POST /api/expenses` (add new record), `DELETE /api/expenses/<id>` (remove record), and `GET /api/dashboard` (aggregated metrics). |
| **`templates/index.html`** | Presentation | The Single Page Application template. Contains semantic HTML5 sections for summary cards, expense submission form, category breakdown, monthly trends, and transaction history. |
| **`static/css/style.css`** | Presentation | Custom stylesheet styling the user interface. Features responsive CSS Grid, Flexbox layouts, status banners, card designs, and custom progress bars. |
| **`static/js/app.js`** | Presentation Logic | Client-side JavaScript orchestrating asynchronous requests using `fetch()`. Handles form submissions, dynamic DOM updates, currency formatting (INR ₹), and delete operations. |
| **`requirements.txt`** | Dependencies | Specifies exact Python packages required for the project: `Flask`, `oracledb`, and `python-dotenv`. |
| **`.env.example`** | Configuration | Sample configuration file providing placeholders for `DB_USER`, `DB_PASSWORD`, and `DB_DSN`. |

---

## ❓ Common Questions & Answers (Viva / Professor Evaluation Guide)

Here are common questions that professors or technical evaluators ask about this project, along with straightforward, beginner-friendly answers:

### Q1: What is the architecture of your application?
> **Answer:** The project uses a classic **3-Tier Architecture**:
> 1. **Presentation Tier (Frontend):** Built with HTML5, CSS3, and Vanilla JavaScript. It behaves as a Single Page Application (SPA) communicating via asynchronous JSON REST calls.
> 2. **Application Tier (Backend):** Built with Python and Flask. It uses Blueprints to organize business logic and validate incoming requests before communicating with the database.
> 3. **Data Tier (Database):** An Oracle Database that stores categories and expenses while enforcing referential integrity and constraints.

### Q2: Why did you choose Flask instead of Django?
> **Answer:** Flask is a micro-framework that is lightweight, beginner-friendly, and unopinionated. It gives us full control over routing and allows us to implement custom database connection pooling directly with `python-oracledb` without the heavy overhead, complex ORM abstraction, or boilerplate of Django.

### Q3: What is Database Connection Pooling and why is it important?
> **Answer:** Opening and closing a physical connection to a database for every single user request is slow and resource-heavy. A **Connection Pool** pre-allocates a set number of connections (e.g., min 2, max 5 in our project). When an API route needs to query the database, it temporarily borrows a connection via `get_connection()` and returns it back to the pool in a `finally` block, ensuring fast response times and efficient resource use.

### Q4: How does your application prevent SQL Injection?
> **Answer:** All queries with dynamic input use **parameterized queries with bind variables** (`:1, :2, :3`) rather than string concatenation or formatted strings. For example:
> ```python
> cursor.execute("INSERT INTO EXPENSES (category_id, amount, note) VALUES (:1, :2, :3)", (cat_id, amount, note))
> ```
> The Oracle database treats the parameters strictly as data values and never executes them as executable SQL commands, completely neutralizing SQL Injection attacks.

### Q5: What makes this a Single Page Application (SPA)?
> **Answer:** The browser loads `index.html` only once. When users perform actions like adding an expense or deleting one, JavaScript captures the event, issues background asynchronous `fetch()` requests, and selectively re-renders only the modified sections of the page without reloading the entire browser tab.

### Q6: How is referential integrity enforced between Categories and Expenses?
> **Answer:** Referential integrity is enforced at the database level using a Foreign Key constraint:
> ```sql
> CONSTRAINT fk_expense_category FOREIGN KEY (category_id) REFERENCES CATEGORIES(category_id)
> ```
> This prevents orphan expense records by ensuring an expense can never be inserted with a `category_id` that does not exist in the `CATEGORIES` table.

### Q7: What are Flask Blueprints and why did you use them?
> **Answer:** A Blueprint in Flask allows developers to organize related routes and handlers into separate modules instead of writing all endpoints in a single large `app.py`. We separated our API into `category_bp` and `expense_bp`, making the codebase organized, clean, and easy to maintain.

### Q8: How do you compute the Monthly and Yearly statistics?
> **Answer:** We execute SQL aggregation queries utilizing Oracle's built-in date functions:
> - `EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM SYSDATE)`
> - `EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM SYSDATE)`
> We wrap `SUM(amount)` inside `NVL(SUM(amount), 0)` so that if no expenses exist for a given period, Oracle returns `0` instead of `NULL`.

### Q9: Why are environment variables and `.env` used?
> **Answer:** Storing database credentials or secrets directly inside source code is bad practice. Using `python-dotenv`, credentials are kept inside a local `.env` file that is excluded from Git via `.gitignore`. This keeps database passwords private and configurable.

### Q10: How does the application handle form validation and database errors?
> **Answer:** Validation is handled at multiple levels:
> 1. **Frontend Validation:** The HTML form marks inputs as `required` and sets `min="0.01"` for amounts. During submission, the submit button is temporarily disabled to prevent accidental double-submits.
> 2. **Backend Validation:** The Flask route (`POST /api/expenses`) checks that both category and amount are provided and that the amount is greater than zero, returning a `400 Bad Request` with an error message if invalid.
> 3. **Database Error Handling:** Operations are wrapped in `try...except oracledb.Error` blocks so that if an issue occurs, the user receives a clean JSON error response (`500 Internal Server Error`) instead of the server crashing.

---

## 🔮 Future Scope & Approach Guide

The current application provides a solid foundation for logging and tracking expenses. Below is an accessible development roadmap to enhance the project with rich UI features and data science analytics.

### 1. Key Areas of Enhancement

#### A. UI/UX Modernization
- **Interactive Visual Charts**: Replace static CSS bars with interactive charting libraries such as **Chart.js** or **Plotly.js** (e.g., interactive donut charts for category shares, line charts showing spending across weeks).
- **Dark Mode**: A simple CSS theme toggle for dark and light modes.
- **Data Export**: Allow users to export their transaction history to a CSV or Excel file with a single click.

#### B. Expense Analytics Using Data Science Libraries
- **Descriptive Analytics**:
  - Daily and weekly spending patterns using **Seaborn** and **Matplotlib**.
  - Category-wise percentage breakdowns to see where the majority of money is spent.
- **Predictive Analytics (Expense Forecasting)**:
  - Time-series forecasting using **Scikit-learn** or **Facebook Prophet** to forecast estimated month-end spend based on spending pace.
- **Smart Budgeting & Alerts**:
  - Alert the user when their spending in a specific category exceeds a set threshold (e.g., 80% of budget).
- **Automatic Expense Categorization (Machine Learning / NLP)**:
  - When a user enters a note like "Subway sandwich" or "Uber to college", a basic machine learning model (**TF-IDF + Naive Bayes**) can predict and automatically select the category ("Food" or "Transport").

---

### 2. Short Approach Guide (Implementation Roadmap)

Here is a step-by-step beginner-friendly guide for adding analytics and interactive charts:

```text
+-----------------------+      +---------------------------+      +-------------------------+
|   Oracle Database     | ---> |    Pandas Data Pipeline   | ---> |  Scikit-Learn / Stats   |
|  (Raw Expense Data)   |      |  (Resampling & Cleaning)  |     |   (Forecasting Model)   |
+-----------------------+      +---------------------------+      +-------------------------+
                                                                               |
                                                                               v
+-----------------------+      +---------------------------+      +-------------------------+
|   Chart.js / Canvas   | <--- |   Vanilla JS / Fetch API  | <--- | Flask Analytics API     |
| (Interactive Visuals) |      |   (Dynamic DOM Injection) |      | (/api/analytics/forecast)|
+-----------------------+      +---------------------------+      +-------------------------+
```

#### Step 1: Install Data Science Dependencies
Install the required analytics libraries:
```bash
pip install pandas numpy scikit-learn plotly
```

#### Step 2: Extract & Clean Data with Pandas
Create a helper function to read data from the Oracle database directly into a Pandas DataFrame:
```python
import pandas as pd
from database.connection import get_connection

def load_expense_dataframe():
    conn = get_connection()
    try:
        query = """
            SELECT e.expense_id, c.category_name, e.amount, e.expense_date
            FROM EXPENSES e
            JOIN CATEGORIES c ON e.category_id = c.category_id
            ORDER BY e.expense_date ASC
        """
        df = pd.read_sql(query, conn)
        df['EXPENSE_DATE'] = pd.to_datetime(df['EXPENSE_DATE'])
        return df
    finally:
        conn.close()
```

#### Step 3: Compute Trends & Forecasts
Use Pandas to calculate daily spending and project the expected month-end total:
```python
def generate_spending_forecast(df):
    # Group spending by day
    daily_spend = df.resample('D', on='EXPENSE_DATE')['AMOUNT'].sum().fillna(0)
    
    # 7-day rolling average to smooth out fluctuations
    rolling_avg = daily_spend.rolling(window=7, min_periods=1).mean()
    
    # Simple projection for remaining days in month
    daily_rate = rolling_avg.iloc[-1] if not rolling_avg.empty else 0
    projected_total = daily_spend.sum() + (daily_rate * 15)
    
    return {
        "projected_total": round(float(projected_total), 2),
        "daily_average": round(float(daily_rate), 2)
    }
```

#### Step 4: Expose an Analytics API Route
Create an endpoint in Flask to return the calculated analytics as JSON:
```python
from flask import Blueprint, jsonify
from analytics.engine import load_expense_dataframe, generate_spending_forecast

analytics_bp = Blueprint('analytics_bp', __name__)

@analytics_bp.route('/api/analytics/forecast', methods=['GET'])
def get_forecast():
    df = load_expense_dataframe()
    if df.empty:
        return jsonify({"message": "Not enough data"}), 200
    return jsonify(generate_spending_forecast(df)), 200
```

#### Step 5: Display Interactive Charts in Frontend
Include **Chart.js** via CDN in `templates/index.html` and render the chart:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<canvas id="categoryChart"></canvas>
```
```javascript
// Fetch dashboard data and render a donut chart
async function renderAnalyticsChart() {
    const res = await fetch('/api/dashboard');
    const data = await res.json();
    
    const ctx = document.getElementById('categoryChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.category_spending.map(i => i.category),
            datasets: [{
                data: data.category_spending.map(i => i.amount),
                backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
            }]
        }
    });
}
```

---

## 🏁 Conclusion

The **Personal Expense Tracker** successfully provides a clean, responsive, and reliable full-stack application for managing everyday personal finances. By combining the simplicity of **Python (Flask)**, the relational consistency of an **Oracle Database**, and the interactivity of an asynchronous **Single Page Application**, the project demonstrates fundamental software development best practices:
- **Clean Architectural Separation**: Presentation, business logic, and database persistence layers remain independent and modular.
- **Safe & Reliable Data Handling**: Database connection pooling, normalized tables, and parameterized queries protect data integrity and prevent security issues like SQL injection.
- **Responsive User Experience**: Asynchronous API calls give the user instant feedback without full page reloads.

With its clean code structure and modular REST endpoints, the application is also well-prepared for future enhancements such as interactive data science dashboards and predictive expense analytics.

---

## 🛠️ Setup & Installation Guide

Follow the steps below to set up and run the Personal Expense Tracker locally on your computer.

## 1. Database Setup (Manual)

Before running the application, you need to manually set up the database tables using SQL*Plus or any Oracle SQL client (such as Oracle SQL Developer).

### 1.1 Connect to your Database
Open your terminal or command prompt and connect to your Oracle database using SQL*Plus:
```bash
sqlplus username/password@hostname:port/service_name
# Example for local XE: sqlplus system/password@localhost:1521/XE
```

### 1.2 Create Tables
Run the following SQL commands to create the `CATEGORIES` and `EXPENSES` tables:

```sql
-- Create CATEGORIES table
-- This table stores the different types of expenses.
CREATE TABLE CATEGORIES (
    category_id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    category_name VARCHAR2(50) NOT NULL UNIQUE
);

-- Create EXPENSES table
-- This table stores individual expense records.
CREATE TABLE EXPENSES (
    expense_id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    category_id NUMBER NOT NULL,
    amount NUMBER(10, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE DEFAULT SYSDATE NOT NULL,
    note VARCHAR2(255),
    CONSTRAINT fk_expense_category FOREIGN KEY (category_id) REFERENCES CATEGORIES(category_id)
);
```

### 1.3 Insert Seed Data
Run these commands to insert default categories and sample expenses so you have initial data to view:

```sql
-- Insert default categories
INSERT INTO CATEGORIES (category_name) VALUES ('Food');
INSERT INTO CATEGORIES (category_name) VALUES ('Transport');
INSERT INTO CATEGORIES (category_name) VALUES ('Bills');
INSERT INTO CATEGORIES (category_name) VALUES ('Shopping');
INSERT INTO CATEGORIES (category_name) VALUES ('Entertainment');
INSERT INTO CATEGORIES (category_name) VALUES ('Health');
INSERT INTO CATEGORIES (category_name) VALUES ('Other');

-- Insert sample expenses
INSERT INTO EXPENSES (category_id, amount, note) VALUES (1, 350, 'Lunch at cafe');
INSERT INTO EXPENSES (category_id, amount, note) VALUES (2, 120, 'Uber ride');
INSERT INTO EXPENSES (category_id, amount, note) VALUES (3, 1500, 'Electricity bill');

-- Commit the transaction to save changes
COMMIT;
```

### 1.4 Test Queries
Verify your tables and data have been correctly created:
```sql
SELECT * FROM CATEGORIES;
SELECT * FROM EXPENSES;
```

---

## 2. Backend Setup (Flask)

1. **Clone the Repository & Navigate to Folder**:
   ```bash
   git clone <repo-url>
   cd personal-expense-tracker
   ```

2. **Install Python Dependencies**:
   Ensure Python 3.8+ is installed, then run:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Database Connection**:
   - Create a `.env` file in the project root (or copy `.env.example` to `.env`):
     ```ini
     DB_USER=system
     DB_PASSWORD=your_password
     DB_DSN=localhost/XE
     ```
   - Alternatively, update the fallback credentials in `config.py`.

4. **Run the Application**:
   Start the Flask development server:
   ```bash
   python app.py
   ```
   Open your browser and navigate to:
   ```text
   http://localhost:5000
   ```
