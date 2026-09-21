class RiskClassifier:
    @staticmethod
    def classify_risk(repayment_score: float) -> dict:
        """
        Classifies repayment capability score (0-100) into risk tiers:
        LOW, MEDIUM, HIGH, VERY HIGH
        and computes confidence score.
        """
        score = float(max(0.0, min(100.0, repayment_score)))

        if score >= 75.0:
            risk_tier = "LOW"
            confidence = round(88.0 + (score - 75.0) * 0.4, 2)
            default_prob = round(max(0.01, 0.05 - (score - 75.0) * 0.002), 4)
            description = "Solid cash-flow stability, low expense ratio, high platform rating."
        elif score >= 60.0:
            risk_tier = "MEDIUM"
            confidence = round(82.0 + (score - 60.0) * 0.4, 2)
            default_prob = round(max(0.06, 0.14 - (score - 60.0) * 0.005), 4)
            description = "Moderate earnings velocity, acceptable debt ratio."
        elif score >= 45.0:
            risk_tier = "HIGH"
            confidence = round(75.0 + (score - 45.0) * 0.4, 2)
            default_prob = round(max(0.15, 0.30 - (score - 45.0) * 0.01), 4)
            description = "Elevated fuel/operational expense burden or income volatility."
        else:
            risk_tier = "VERY HIGH"
            confidence = round(65.0 + score * 0.2, 2)
            default_prob = round(min(0.65, 0.35 + (45.0 - score) * 0.008), 4)
            description = "Significant income fluctuation, high debt ratio, low savings reserve."

        return {
            "risk_level": risk_tier,
            "confidence_score": min(99.0, confidence),
            "default_probability": default_prob,
            "risk_description": description
        }
