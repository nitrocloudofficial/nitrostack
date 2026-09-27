from fastapi import APIRouter
from app.api.endpoints import auth, chat, documents, employees, projects

api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
