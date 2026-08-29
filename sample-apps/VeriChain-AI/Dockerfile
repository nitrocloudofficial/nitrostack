FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project source
COPY . .

# Expose Streamlit and FastAPI ports
EXPOSE 8000 8501

# Command is specified at docker-compose level
CMD ["python", "app.py"]
