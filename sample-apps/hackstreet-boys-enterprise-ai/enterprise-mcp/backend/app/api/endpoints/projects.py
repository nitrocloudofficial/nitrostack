from fastapi import APIRouter
router = APIRouter()
@router.get("/")
async def get_projects():
    return {"message": "projects endpoint"}
