from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.domain_models import User
from backend.schemas.domain_schemas import CreditEvaluationRequest, CreditScoreResponse
from backend.services.credit_service import CreditService

router = APIRouter(tags=["Credit Underwriting Engine"])

@router.post("/credit-score", response_model=CreditScoreResponse)
def evaluate_credit_score(
    req: CreditEvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = CreditService(db)
    return service.evaluate_credit_score(current_user.id, req)
