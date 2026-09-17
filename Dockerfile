# ==============================================================================
#  Personal Expense Tracker - Fast, Lightweight Production Dockerfile
# ==============================================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies (pure wheels, fast install ~10s)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose HTTP port 80
EXPOSE 80

# Run with Gunicorn WSGI server (2 workers optimized for t2.micro memory)
CMD ["gunicorn", "--workers", "2", "--bind", "0.0.0.0:80", "--access-logfile", "-", "--error-logfile", "-", "app:app"]
