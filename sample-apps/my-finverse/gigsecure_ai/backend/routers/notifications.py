from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.domain_models import User
from backend.schemas.domain_schemas import NotificationSendRequest
from backend.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications Engine"])

@router.post("/send")
def send_notification(req: NotificationSendRequest, db: Session = Depends(get_db)):
    service = NotificationService(db)
    notif = service.send_notification(req)
    return {"status": "SUCCESS", "id": notif.id, "message": "Notification dispatched."}

@router.get("/my")
def get_my_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = NotificationService(db)
    return service.get_user_notifications(current_user.id)
