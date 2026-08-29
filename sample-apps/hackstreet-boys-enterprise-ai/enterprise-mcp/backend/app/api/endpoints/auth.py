# Placeholder for auth endpoints
from fastapi import APIRouter

router = APIRouter()

@router.post("/login")
async def login():
    return {"message": "login endpoint"}

@router.post("/refresh")
async def refresh():
    return {"message": "refresh endpoint"}
