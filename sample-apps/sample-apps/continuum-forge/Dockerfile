# Use official lightweight Python 3.11 image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/continuum

# Set working directory
WORKDIR /app

# Install system dependencies needed for C extensions & PostgreSQL client libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files into container
COPY . /app

# Expose default ports if needed
EXPOSE 8000

# Default command runs full CONTINUUM Phase 1 initialization
CMD ["python", "continuum/main.py"]
