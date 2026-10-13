from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.domain_models import User, Nominee, Claim
from backend.services.succession_service import SuccessionService
from backend.services.ocr_service import OCRService
from backend.services.llm_service import LLMDocumentParserService
from backend.services.death_registry_service import DeathRegistryService

router = APIRouter(prefix="/succession", tags=["Succession & Nominee Assistance"])

@router.get("/death-registry/{aadhaar}")
def query_death_registry(aadhaar: str):
    return DeathRegistryService.query_civil_registry(aadhaar)

@router.post("/parse-document")
async def parse_document(file: UploadFile = File(...)):
    contents = await file.read()
    ocr_text = OCRService.extract_text_from_document(file.filename, contents)
    json_result = LLMDocumentParserService.parse_extracted_text_to_json(ocr_text)
    return json_result

@router.post("/rescue/{nominee_id}")
def trigger_rescue(
    nominee_id: int,
    worker_aadhaar: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    svc = SuccessionService(db)
    return svc.execute_succession_rescue(current_user.id, worker_aadhaar, nominee_id)

@router.get("/claims")
def get_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    claims = db.query(Claim).filter(Claim.user_id == current_user.id).order_by(Claim.id.desc()).all()
    return [
        {
            "id": c.id,
            "claim_type": c.claim_type,
            "asset_type": c.asset_type,
            "asset_id": c.asset_id,
            "death_certificate_no": c.death_certificate_no,
            "verification_status": c.verification_status,
            "claim_amount": c.claim_amount,
            "form_url": c.form_url,
            "created_at": c.created_at.strftime("%Y-%m-%d") if c.created_at else "N/A"
        }
        for c in claims
    ]
