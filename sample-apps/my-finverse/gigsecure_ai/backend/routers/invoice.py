from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.domain_models import User
from backend.schemas.invoice_schema import InvoiceUploadRequest, InvoiceUploadResponse
from backend.services.invoice_service import InvoiceService

router = APIRouter(prefix="/invoice", tags=["Invoice Management"])

@router.post("/upload", response_model=InvoiceUploadResponse)
def upload_invoice(
    req: InvoiceUploadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = InvoiceService(db)
    return service.process_invoice_upload(current_user.id, req)
