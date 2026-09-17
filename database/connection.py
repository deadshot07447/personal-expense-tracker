import pymysql
import pymysql.cursors
from dbutils.pooled_db import PooledDB
from contextlib import contextmanager
from config import Config

# Global connection pool instance
_pool = None


def init_pool():
    """
    Initializes the MySQL PooledDB connection pool to the user-created database.
    Assumes database, schema, and initial data have been set up by the user beforehand.
    """
    global _pool
    if _pool is None:
        try:
            _pool = PooledDB(
                creator=pymysql,
                maxconnections=10,
                mincached=2,
                maxcached=5,
                maxshared=3,
                blocking=True,
                host=Config.DB_HOST,
                port=Config.DB_PORT,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                database=Config.DB_NAME,
                charset='utf8mb4',
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=False
            )
            print(f"Successfully connected to MySQL database '{Config.DB_NAME}'.")
        except Exception as e:
            print(f"Error connecting to MySQL database '{Config.DB_NAME}': {e}")
            raise


def get_connection():
    """
    Acquires a connection from the MySQL pool.
    Calling conn.close() returns it to the pool.
    """
    global _pool
    if _pool is None:
        init_pool()
    return _pool.connection()


@contextmanager
def get_db_cursor(commit=False):
    """
    Context manager that yields a dictionary cursor and handles
    commit & returning the connection to the pool automatically.
    
    All queries executed through this cursor use parameterized bind placeholders (%s)
    to guarantee complete immunity against SQL injection attacks.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            yield cursor
            if commit:
                conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
