SUPPORTED_BANKS = [
    "State Bank of India",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Punjab National Bank",
    "Kotak Mahindra",
    "IDFC First",
    "Canara Bank",
    "Bank of Baroda"
]

def is_valid_bank(bank_name: str) -> bool:
    return bank_name in SUPPORTED_BANKS
