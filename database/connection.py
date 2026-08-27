import oracledb
from config import Config

# Initialize a global connection pool variable
_pool = None

def init_pool():
    """
    Initializes the Oracle connection pool.
    We use a pool to efficiently manage database connections,
    especially in a web application like Flask where multiple
    requests might come in concurrently.
    """
    global _pool
    if _pool is None:
        try:
            # Create a connection pool with the configuration settings
            _pool = oracledb.create_pool(
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                dsn=Config.DB_DSN,
                min=2,
                max=5,
                increment=1
            )
            print("Successfully created Oracle Database connection pool.")
        except oracledb.Error as e:
            print(f"Error creating connection pool: {e}")
            raise

def get_connection():
    """
    Acquires a connection from the pool.
    Usage:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            # execute queries
        finally:
            conn.close() # returns the connection to the pool
    """
    if _pool is None:
        init_pool()
    return _pool.acquire()
