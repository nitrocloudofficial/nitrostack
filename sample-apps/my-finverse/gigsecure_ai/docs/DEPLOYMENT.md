# Deployment Guide - GigSecure AI

## Production Prerequisites
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+
- Nginx Reverse Proxy
- Python 3.12 & Node.js 20

## Environment Configuration
Copy `.env.example` to `.env`:
```env
APP_ENV=production
SECRET_KEY=gigsecure_super_secret_jwt_key_2026_production
DATABASE_URL=postgresql://postgres:postgres_password_2026@postgres:5432/gigsecure_db
REDIS_URL=redis://redis:6379/0
```

## Running Container Orchestration
```bash
docker-compose -f docker-compose.yml up -d --build
```

Verify service containers:
```bash
docker-compose ps
```
