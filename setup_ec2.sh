#!/usr/bin/env bash
# ==============================================================================
#  Personal Expense Tracker - Automated AWS EC2 (Ubuntu) Deployment Script
# ==============================================================================
#  Run this script on a fresh Ubuntu EC2 instance (t2.micro / t3.micro):
#    chmod +x setup_ec2.sh
#    ./setup_ec2.sh
# ==============================================================================

set -e

echo "=================================================="
echo " Starting Personal Expense Tracker EC2 Deployment "
echo "=================================================="

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# 1. System Updates & Prerequisites
echo "--> [1/7] Updating system packages & installing dependencies..."
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    mysql-server \
    nginx \
    git \
    curl \
    openssl

# 2. Configure MySQL Database
echo "--> [2/7] Configuring local MySQL 8.0 Server..."
sudo systemctl enable mysql
sudo systemctl start mysql

DB_NAME="expense_tracker"
DB_USER="tracker_user"
DB_PASS="$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)"

sudo mysql <<EOF
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
EOF

# 3. Import Schema & Seed Data
echo "--> [3/7] Importing Table Schema and Seed Data into MySQL..."
sudo mysql "${DB_NAME}" < "${APP_DIR}/database/schema.sql"
sudo mysql "${DB_NAME}" < "${APP_DIR}/database/seed.sql"

# 4. Set up Python Virtual Environment & Install Dependencies
echo "--> [4/7] Setting up Python virtual environment & installing dependencies..."
if [ ! -d "${APP_DIR}/venv" ]; then
    python3 -m venv "${APP_DIR}/venv"
fi

source "${APP_DIR}/venv/bin/activate"
pip install --upgrade pip
pip install -r "${APP_DIR}/requirements.txt"

# 5. Generate .env File
echo "--> [5/7] Creating production .env configuration..."
SECRET_KEY="$(openssl rand -hex 32)"

cat > "${APP_DIR}/.env" <<EOF
# Production Environment Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_NAME=${DB_NAME}
SECRET_KEY=${SECRET_KEY}
EOF

chmod 600 "${APP_DIR}/.env"

# 6. Configure Systemd Service (Gunicorn)
echo "--> [6/7] Setting up and starting Systemd service..."
sudo cp "${APP_DIR}/deploy/expense-tracker.service" /etc/systemd/system/expense-tracker.service
sudo systemctl daemon-reload
sudo systemctl enable expense-tracker
sudo systemctl restart expense-tracker

# 7. Configure Nginx Reverse Proxy
echo "--> [7/7] Configuring Nginx reverse proxy..."
sudo chmod 755 /home/ubuntu
sudo chmod -R 755 "${APP_DIR}/static"
sudo rm -f /etc/nginx/sites-enabled/default
sudo cp "${APP_DIR}/deploy/nginx.conf" /etc/nginx/sites-available/expense-tracker
sudo ln -sf /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled/expense-tracker
sudo nginx -t
sudo systemctl restart nginx

# Retrieve Public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || curl -s https://ifconfig.me || echo "<Your-EC2-Public-IP>")

echo ""
echo "=========================================================="
echo " 🎉 DEPLOYMENT COMPLETE!"
echo "=========================================================="
echo " Application URL: http://${PUBLIC_IP}"
echo ""
echo " Pre-seeded Demo Accounts:"
echo "   - aditya  / aditya123"
echo "   - mayuri  / mayuri123"
echo "   - demo    / demo123"
echo ""
echo " Useful Management Commands:"
echo "   - Check app status:   sudo systemctl status expense-tracker"
echo "   - Restart app:        sudo systemctl restart expense-tracker"
echo "   - View app logs:      sudo journalctl -u expense-tracker -f"
echo "   - Nginx logs:         sudo tail -f /var/log/nginx/error.log"
echo "=========================================================="
