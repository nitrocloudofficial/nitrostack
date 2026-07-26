class EmailNotificationHandler:
    @staticmethod
    def send_email(to_email: str, subject: str, body: str) -> dict:
        """
        Simulates dispatching email via SMTP / AWS SES / SendGrid API.
        """
        print(f"[EMAIL DISPATCH] To: {to_email} | Subject: {subject} | Body: {body[:60]}...")
        return {
            "status": "DELIVERED",
            "recipient": to_email,
            "subject": subject,
            "channel": "EMAIL"
        }
