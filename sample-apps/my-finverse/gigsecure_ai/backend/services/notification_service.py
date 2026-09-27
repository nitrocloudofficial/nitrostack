from sqlalchemy.orm import Session
from backend.models.domain_models import Notification
from backend.notifications.sms import SMSNotificationHandler
from backend.notifications.email import EmailNotificationHandler
from backend.notifications.push import PushNotificationHandler
from datetime import datetime

class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def dispatch_alert(self, user_id: int, title: str, message: str, channel: str = "SMS", email: str = None, phone: str = None) -> dict:
        if channel == "SMS" and phone:
            SMSNotificationHandler.send_sms(phone, message)
        elif channel == "EMAIL" and email:
            EmailNotificationHandler.send_email(email, title, message)
        elif channel == "PUSH":
            PushNotificationHandler.send_push(user_id, title, message)
        else:
            SMSNotificationHandler.send_sms(phone or "9876543210", message)

        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            channel=channel,
            status="SENT",
            created_at=datetime.utcnow()
        )
        self.db.add(notif)
        self.db.commit()
        self.db.refresh(notif)

        return {
            "id": notif.id,
            "title": title,
            "message": message,
            "channel": channel,
            "status": "SENT",
            "created_at": notif.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
