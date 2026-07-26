import re

GST_REGEX = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"

def validate_gstin_format(gstin: str) -> bool:
    if not gstin:
        return False
    return bool(re.match(GST_REGEX, gstin.strip().upper()))

def verify_gst_portal(gstin: str) -> dict:
    formatted = gstin.strip().upper()
    is_valid_pattern = validate_gstin_format(formatted)

    if not is_valid_pattern:
        return {
            "status": "GST Invalid",
            "is_valid": False,
            "business_name": "N/A",
            "registration_date": "N/A",
            "gstin": formatted,
            "taxpayer_type": "N/A",
            "message": "Invalid GSTIN format structure"
        }

    # Simulated official GST Portal response logic
    if formatted.endswith("9Z9"):
        return {
            "status": "GST Cancelled",
            "is_valid": False,
            "business_name": "Apex Logistics Private Limited (Deregistered)",
            "registration_date": "2019-04-12",
            "gstin": formatted,
            "taxpayer_type": "Regular",
            "message": "GST registration was cancelled by tax authority"
        }
    elif formatted.endswith("8Z8"):
        return {
            "status": "GST Suspended",
            "is_valid": False,
            "business_name": "Speedy Freight Services (Suspended)",
            "registration_date": "2021-08-20",
            "gstin": formatted,
            "taxpayer_type": "Composition",
            "message": "GST registration suspended due to non-filing of GSTR-3B"
        }

    return {
        "status": "GST Valid",
        "is_valid": True,
        "business_name": "Swiggy / Zomato Verified Logistics Partner Ltd",
        "registration_date": "2018-01-15",
        "gstin": formatted,
        "taxpayer_type": "Regular",
        "message": "Active verified GSTIN on Government GST Portal"
    }
