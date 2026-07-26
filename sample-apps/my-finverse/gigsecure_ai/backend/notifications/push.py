class PushNotificationHandler:
    @staticmethod
    def send_push(user_id: int, title: str, body: str) -> dict:
        """
        Simulates dispatching Web Push notification via Firebase Cloud Messaging (FCM).
        """
        print(f"[PUSH DISPATCH] UserID: {user_id} | Title: {title} | Body: {body[:60]}...")
        return {
            "status": "DELIVERED",
            "user_id": user_id,
            "title": title,
            "channel": "PUSH"
        }
