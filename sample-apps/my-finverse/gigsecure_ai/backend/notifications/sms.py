class SMSNotificationHandler:
    @staticmethod
    def send_sms(phone: str, message: str) -> dict:
        """
        Simulates dispatching SMS via Twilio / Fast2SMS API.
        """
        print(f"[SMS DISPATCH] Phone: {phone} | Message: {message}")
        return {
            "status": "DELIVERED",
            "phone": phone,
            "channel": "SMS"
        }
