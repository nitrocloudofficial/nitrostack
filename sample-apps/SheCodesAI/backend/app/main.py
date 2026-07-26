from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import process, tasks, memory, integrations

app = FastAPI(
    title=settings.APP_NAME,
    description="Adaptive AI Context Intelligence Platform Microservice Gateway",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(process.router)
app.include_router(tasks.router)
app.include_router(memory.router)
app.include_router(integrations.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "tagline": "One Conversation. Infinite Intelligent Workflows.",
        "mcp_gateway": "Active",
        "chromadb_vector_store": "Ready (1,536d)",
        "supabase_auth": "Active"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ContextOS FastAPI Backend"}
