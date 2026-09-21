from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings

def setup_cors(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
