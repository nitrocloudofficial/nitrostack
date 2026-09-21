from fastapi import APIRouter
router = APIRouter()
@router.get("/")
async def get_employees():
    return {"message": "employees endpoint"}
