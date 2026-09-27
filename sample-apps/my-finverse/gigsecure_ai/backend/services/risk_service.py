class FraudRiskService:
    @staticmethod
    def calculate_fraud_score(
        is_duplicate: bool,
        is_gst_valid: bool,
        is_eway_valid: bool,
        delivery_confidence: float,
        merchant_trust_score: float,
        amount: float
    ) -> dict:
        risk_factors = []
        score = 0.0

        if is_duplicate:
            score += 95.0
            risk_factors.append("CRITICAL: SHA-256 Hash Duplicate Financing Detected across Lenders")

        if not is_gst_valid:
            score += 40.0
            risk_factors.append("HIGH: GSTIN Verification Failed or Suspended on GST Portal")

        if not is_eway_valid:
            score += 25.0
            risk_factors.append("MEDIUM: Invalid or Expired eWay Bill Number")

        if delivery_confidence < 50.0:
            score += 30.0
            risk_factors.append("HIGH: Unconfirmed Logistics Delivery GPS Status")

        if merchant_trust_score < 50.0:
            score += 20.0
            risk_factors.append("MEDIUM: Merchant Trust Score below 50.0 threshold")

        if amount > 100000.0:
            score += 10.0
            risk_factors.append("INFO: High Value Invoice Amount Exceeds INR 1,00,000 Threshold")

        total_score = min(100.0, score)

        if total_score >= 80.0:
            risk_level = "CRITICAL"
        elif total_score >= 50.0:
            risk_level = "HIGH"
        elif total_score >= 25.0:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        if not risk_factors:
            risk_factors.append("No active fraud indicators. Verified authentic commercial invoice.")

        return {
            "fraud_score": round(total_score, 1),
            "risk_level": risk_level,
            "risk_factors": risk_factors
        }
