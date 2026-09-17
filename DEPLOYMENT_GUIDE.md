# 🚀 AWS EC2 Deployment Guide

This guide walks you through deploying the **Personal Expense Tracker** (`updated-version` branch) to a free-tier eligible **AWS EC2 Ubuntu** instance using **Gunicorn**, **Nginx**, **Systemd**, and **MySQL 8.0**.

---

## 📋 Prerequisites

1. An **AWS Account** ([Sign up for AWS Free Tier](https://aws.amazon.com/free/)).
2. An SSH Key Pair (`.pem` file) created in AWS Console.

---

## Step 1: Launch an EC2 Instance in AWS Console

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/ec2/) and navigate to the **EC2 Dashboard**.
2. Click **"Launch Instance"**.
3. Configure the following settings:
   - **Name**: `Personal-Expense-Tracker`
   - **Application and OS Images (AMI)**: Select **Ubuntu** (Choose **Ubuntu Server 24.04 LTS** or **22.04 LTS**, 64-bit x86).
   - **Instance Type**: `t2.micro` or `t3.micro` (*Free tier eligible*).
   - **Key pair (login)**: Select your existing key pair or click **"Create new key pair"** (Name: `my-ec2-key`, Type: `RSA`, Format: `.pem`). Save the `.pem` file safely on your computer.
4. **Network Settings (Security Group)**:
   - Click **Edit** under Network Settings.
   - Ensure the following firewall rules are present:
     | Type | Protocol | Port Range | Source | Purpose |
     | :--- | :--- | :--- | :--- | :--- |
     | **SSH** | TCP | `22` | Anywhere (`0.0.0.0/0`) or My IP | Remote SSH terminal access |
     | **HTTP** | TCP | `80` | Anywhere (`0.0.0.0/0`) | Web browser traffic |
5. **Storage**: Keep default (8 GiB or 20 GiB gp3).
6. Click **"Launch Instance"** and wait 1–2 minutes until the instance state shows **Running**.
7. Click on your instance and copy its **Public IPv4 address** (e.g., `54.210.120.45`).

---

## Step 2: Connect to Your EC2 Instance via SSH

Open your local terminal (PowerShell, Command Prompt, or Git Bash on Windows, or Terminal on macOS/Linux).

### On Linux / macOS / Git Bash:
```bash
# Set secure permissions on your private key (required by SSH)
chmod 400 /path/to/my-ec2-key.pem

# SSH into the Ubuntu instance
ssh -i /path/to/my-ec2-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
```

### On Windows PowerShell:
```powershell
ssh -i "C:\path\to\my-ec2-key.pem" ubuntu@<YOUR-EC2-PUBLIC-IP>
```

---

## Step 3: Clone the Repository (`updated-version` branch)

Once connected to your EC2 instance prompt (`ubuntu@ip-...:~$`), clone the `updated-version` branch:

```bash
git clone -b updated-version https://github.com/deadshot07447/personal-expense-tracker.git
cd personal-expense-tracker
```

*(Note: If the repository is private, you can add your GitHub SSH key or generate a Personal Access Token).*

---

## Step 4: Run the 1-Click Automated Setup Script

We have bundled an automated provisioning script [`setup_ec2.sh`](setup_ec2.sh) that handles the entire setup:
- Installs Python 3, venv, MySQL Server 8.0, and Nginx.
- Configures the local MySQL database `expense_tracker`.
- Imports [`database/schema.sql`](database/schema.sql) and [`database/seed.sql`](database/seed.sql) (with 430 expenses across 2026).
- Creates a Python virtual environment and installs dependencies (`Flask`, `Gunicorn`, `PyMySQL`, `DBUtils`, etc.).
- Generates a production `.env` file with secure random keys.
- Configures and starts the **Systemd** daemon and **Nginx** reverse proxy.

Run the script with:

```bash
chmod +x setup_ec2.sh
./setup_ec2.sh
```

The script takes approximately 2–3 minutes to complete. Once finished, you will see the completion banner:

```text
==========================================================
 🎉 DEPLOYMENT COMPLETE!
==========================================================
 Application URL: http://54.210.120.45

 Pre-seeded Demo Accounts:
   - aditya  / aditya123
   - mayuri  / mayuri123
   - demo    / demo123
==========================================================
```

---

## Step 5: Verify in Browser

1. Open your web browser and navigate to:
   ```text
   http://<YOUR-EC2-PUBLIC-IP>
   ```
2. The sign-in page will load instantly.
3. Sign in using any of the pre-seeded demo accounts:
   - **Username**: `aditya` | **Password**: `aditya123`
   - **Username**: `mayuri` | **Password**: `mayuri123`
   - **Username**: `demo`   | **Password**: `demo123`

---

## 🛠️ Server Management & Maintenance Commands

Here are handy commands for inspecting and managing your deployment:

### Check Application Service Status
```bash
sudo systemctl status expense-tracker
```

### Restart the Application (after code updates)
```bash
sudo systemctl restart expense-tracker
```

### View Live Application Logs
```bash
# View Gunicorn & Flask output in real-time
sudo journalctl -u expense-tracker -f
```

### Check Nginx Status & Logs
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Pulling Future Code Updates
When you push new commits to GitHub, update your live EC2 instance with:
```bash
cd ~/personal-expense-tracker
git pull origin updated-version
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart expense-tracker
```

---

## 🔒 Optional: Add Free SSL / HTTPS with Let's Encrypt

If you point a domain name (e.g. `expense.yourdomain.com`) to your EC2 Public IP:

```bash
# 1. Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 2. Obtain and configure free SSL certificate
sudo certbot --nginx -d expense.yourdomain.com

# Certbot will automatically configure HTTPS on port 443 and auto-renew!
```
