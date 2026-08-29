import hashlib

def generate_invoice_sha256(gstin: str, platform_id: str, invoice_number: str, invoice_date: str, amount: float, buyer_gstin: str = "") -> str:
    """
    Generates a deterministic SHA-256 fingerprint from invoice parameters:
    SHA256(GSTIN|PlatformID|InvoiceNumber|InvoiceDate|Amount|BuyerGSTIN)
    """
    raw_string = f"{gstin.strip().upper()}|{platform_id.strip().upper()}|{invoice_number.strip().upper()}|{str(invoice_date).strip()}|{float(amount):.2f}|{buyer_gstin.strip().upper()}"
    return hashlib.sha256(raw_string.encode('utf-8')).hexdigest()
