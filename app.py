from flask import Flask, render_template
from config import Config
from routes.category_routes import category_bp
from routes.expense_routes import expense_bp
from database.connection import init_pool

# Initialize the Flask application
app = Flask(__name__)
app.config.from_object(Config)

# Register the API blueprints
# This separates our routing logic into different files for better organization
app.register_blueprint(category_bp)
app.register_blueprint(expense_bp)

@app.route('/')
def index():
    """
    Serve the main Single Page Application (SPA).
    Since we are using Vanilla JS, we just return the HTML file,
    and JS will handle fetching data from the /api endpoints.
    """
    return render_template('index.html')

if __name__ == '__main__':
    # Initialize the database connection pool before starting the server
    # Note: If the database is not accessible, this might throw an error on startup.
    # For a beginner project, this fail-fast behavior is usually okay.
    print("Initializing Database Connection Pool...")
    try:
        init_pool()
    except Exception as e:
        print(f"WARNING: Could not connect to Oracle database. Ensure it is running and credentials in config.py are correct.\nError: {e}")

    # Run the Flask development server
    app.run(debug=True, host='0.0.0.0', port=5000)
