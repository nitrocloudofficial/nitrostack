# VeriChain AI Production Deployment Guide

VeriChain AI is optimized for cloud scaling using **Docker** and **Docker Compose** or orchestration frameworks like **Kubernetes**.

---

## 1. Single-Instance Deployment via Docker Compose

Our pre-configured `docker-compose.yml` launches both the FastAPI backend and Streamlit dashboard in isolated container networks.

### Build and Launch Services
To compile container layers and start services in detatched mode:
```bash
docker-compose up --build -d
```

### Inspect Container Processes
Check running states and exposed ports:
```bash
docker-compose ps
```
- **FastAPI backend** listens on [http://localhost:8000](http://localhost:8000)
- **Streamlit frontend** listens on [http://localhost:8501](http://localhost:8501)

### Check Logs
Stream real-time log outputs:
```bash
docker-compose logs -f
```

---

## 2. Production Hardening Checklist

Prior to staging or production deploy, complete these security configurations:

### A. Environment Configuration (`.env`)
Modify standard placeholder values to secure system configurations:
```ini
# Production Secret Key
SECRET_KEY=generate_a_secure_long_random_hash_string

# Logging Levels
LOG_LEVEL=WARNING
```

### B. Persistent Database Storage
Ensure the SQLite db directory is mounted out of ephemeral container structures to avoid state loss on restarts:
```yaml
volumes:
  - sqlite_data:/app/database
```

### C. Reverse Proxy & TLS Configuration
We recommend deploying an NGINX proxy or Cloudflare gateway in front of ports 8000 and 8501 to enable SSL/TLS termination (`https`).
