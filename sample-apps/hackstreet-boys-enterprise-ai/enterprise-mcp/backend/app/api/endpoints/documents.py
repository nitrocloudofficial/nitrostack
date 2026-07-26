from fastapi import APIRouter
router = APIRouter()
@router.get("/")
async def get_documents():
    return {"message": "documents endpoint"}
