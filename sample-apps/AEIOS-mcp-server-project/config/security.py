import os

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3001",
    "http://localhost:3000",
]

API_KEY_HEADER = "X-API-Key"
API_KEY = os.getenv("AEIOS_API_KEY", "")
AUTH_ENABLED = bool(API_KEY)
