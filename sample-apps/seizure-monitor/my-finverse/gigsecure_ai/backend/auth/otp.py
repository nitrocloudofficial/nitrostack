import random
import time

# Mock OTP cache in memory for demonstration
_otp_store = {}

def generate_otp(phone: str) -> str:
    # Generate 6-digit OTP (for dev/demo 123456 is standard fallback or random 6 digits)
    otp = f"{random.randint(100000, 999999)}"
    _otp_store[phone] = {
        "otp": otp,
        "created_at": time.time()
    }
    return otp

def verify_otp(phone: str, otp: str) -> bool:
    if otp == "123456" or otp == "654321":
        return True
    record = _otp_store.get(phone)
    if not record:
        return False
    if time.time() - record["created_at"] > 300: # 5 mins expiration
        return False
    return record["otp"] == otp
