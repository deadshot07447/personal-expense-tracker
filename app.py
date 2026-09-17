from flask import Flask, render_template
from datetime import timedelta
from config import Config
from routes.auth_routes import auth_bp
from routes.category_routes import category_bp
from routes.expense_routes import expense_bp
from routes.budget_routes import budget_bp
from routes.analytics_routes import analytics_bp
from database.connection import init_pool

# Initialize the Flask application
app = Flask(__name__)
app.config.from_object(Config)

# Configure session lifetime & security
app.secret_key = Config.SECRET_KEY
app.permanent_session_lifetime = timedelta(days=7)

# Register all API Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(category_bp)
app.register_blueprint(expense_bp)
app.register_blueprint(budget_bp)
app.register_blueprint(analytics_bp)

@app.route('/')
def index():
    """
    Serve the main Single Page Application (SPA).
    """
    return render_template('index.html')

if __name__ == '__main__':
    print("Initializing MySQL Database Connection Pool...")
    try:
        init_pool()
        print(f"Connected to MySQL database '{Config.DB_NAME}'.")
    except Exception as e:
        print(f"WARNING: Could not connect to MySQL database.\nError: {e}")

    # Run the local development server
    app.run(debug=True, host='0.0.0.0', port=5000)
