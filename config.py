import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

class Config:
    # Database Configuration
    # Defaults set for a typical local Oracle XE installation
    DB_USER = os.environ.get('DB_USER', 'system')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'password')
    
    # DSN (Data Source Name)
    # Examples:
    # 'localhost/XE' (for older XE versions)
    # 'localhost/XEPDB1' (for 18c/19c/21c XE pluggable database)
    DB_DSN = os.environ.get('DB_DSN', 'localhost/XE')
