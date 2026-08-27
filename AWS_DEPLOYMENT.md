# AWS EC2 Deployment Guide

This guide explains how to deploy your Personal Expense Tracker (Flask + Oracle Database) to a single Amazon EC2 instance, without using Amazon RDS.

## 1. Provisioning the EC2 Instance

1. Log into your AWS Console and go to **EC2** > **Launch Instance**.
2. **Name**: `expense-tracker-server`
3. **OS Image (AMI)**: Choose **Amazon Linux 2023**.
4. **Instance Type**: Choose **`c7i-flex.large`**. 
   > ⚠️ **NOTE**: This is not covered by the free tier, but provides 4GB of RAM which is perfect for running the heavy Oracle Database container for a short demo.
5. **Key Pair**: Create or select an existing key pair to SSH into your server.
6. **Storage**: Increase the Root Volume to at least **30 GB** (gp3).
7. **Security Group (Firewall)**: Allow the following inbound traffic:
   - **SSH (Port 22)**: From your IP (for server access).
   - **Custom TCP (Port 5000)**: Anywhere (to access the Flask app directly).
   - *(Optional)* **Custom TCP (Port 1521)**: Only if you want to connect to the database remotely from your home computer. Keep closed for better security.

## 2. Server Setup (SSH)

Once the instance is running, connect to it using SSH from your terminal:
```bash
ssh -i /path/to/your-key.pem ec2-user@<your-ec2-public-ip>
```

Update the server and install necessary tools:
```bash
sudo yum update -y
sudo yum install python3-pip git docker -y
sudo systemctl enable docker
sudo systemctl start docker
```

## 3. Running Oracle Database (via Docker)

Installing Oracle natively on Ubuntu is very complicated. The easiest and cleanest way for a single EC2 instance is to use the official Oracle Docker image.

1. Start the Oracle Database Free container:
   ```bash
   sudo docker run -d --name oracle-db \
     -p 1521:1521 \
     -e ORACLE_PASSWORD=MySecurePassword123 \
     container-registry.oracle.com/database/free:latest
   ```
   *(This downloads the database and starts it. It may take 5-10 minutes for the database to fully initialize on the first run).*

## 4. Application Setup

1. **Upload your code**: The best way is to push your local code to GitHub, then clone it on the EC2 instance.
   ```bash
   git clone https://github.com/yourusername/personal-expense-tracker.git
   cd personal-expense-tracker
   ```
2. **Setup Python Environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Configure the App**:
   Create the `.env` file on the server:
   ```bash
   nano .env
   ```
   Add your production configuration:
   ```ini
   DB_USER=system
   DB_PASSWORD=MySecurePassword123
   DB_DSN=localhost/FREEPDB1
   ```
   *(Press `Ctrl+X`, then `Y`, then `Enter` to save).*

## 5. Initialize the Database

You need to run your `CREATE TABLE` scripts inside the Docker container.

1. Open a bash shell inside the running Oracle container:
   ```bash
   sudo docker exec -it oracle-db /bin/bash
   ```
2. Connect to SQL*Plus inside the container:
   ```bash
   sqlplus system/MySecurePassword123@localhost/FREEPDB1
   ```
3. Copy and paste your `CREATE TABLE` and `INSERT` commands from your `README.md`.
4. Type `exit` to leave SQL*Plus, and `exit` again to leave the Docker container.

## 6. Running the App (Production Way)

Do not use `python app.py` for production. We will use **Gunicorn**, a production-ready Python web server.

1. Install Gunicorn:
   ```bash
   pip install gunicorn
   ```
2. Run your app in the background using Gunicorn:
   ```bash
   nohup gunicorn -w 4 -b 0.0.0.0:5000 app:app &
   ```
   - `-w 4` means use 4 worker processes.
   - `0.0.0.0:5000` binds the app to port 5000 on all network interfaces.
   - `nohup` and `&` keep the app running even after you close your SSH terminal.

## 7. Access your App

Open your browser and navigate to:
`http://<your-ec2-public-ip>:5000`

Your Personal Expense Tracker is now live on the internet! 

*(For a more advanced setup later, you can look into installing **Nginx** to run the app on port 80/443 without needing the `:5000` in the URL).*
