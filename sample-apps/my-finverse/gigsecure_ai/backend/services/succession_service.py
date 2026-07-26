import random
from sqlalchemy.orm import Session
from backend.models.domain_models import Claim, ClaimStatus
from backend.services.death_registry_service import DeathRegistryService
from backend.services.account_aggregator_service import AccountAggregatorService
from datetime import datetime

class SuccessionService:
    def __init__(self, db: Session):
        self.db = db

    def execute_succession_rescue(self, nominee_user_id: int, worker_aadhaar: str, nominee_id: int) -> dict:
        # 1. Civil Registry Death Lookup
        death_info = DeathRegistryService.query_civil_registry(worker_aadhaar)
        if not death_info["is_deceased"]:
            return {
                "status": "FAILED",
                "message": "Worker is currently registered active & alive in Civil Registry. Succession rescue cannot be triggered.",
                "death_info": death_info
            }

        # 2. RBI Account Aggregator Asset Discovery
        aa_data = AccountAggregatorService.discover_all_assets(worker_aadhaar)

        # 3. Generate Multi-Institution Claim Form Records
        claims = []
        for asset in aa_data["assets"]:
            claim_id_str = f"CLM-{random.randint(100000, 999999)}"
            new_claim = Claim(
                nominee_id=nominee_id,
                user_id=nominee_user_id,
                claim_type=f"SUCCESSION_{asset['category'].upper().replace(' ', '_')}",
                asset_type=asset["category"],
                asset_id=asset["account_number"],
                death_certificate_no=death_info["certificate_number"],
                death_date=death_info["death_date"],
                verification_status=ClaimStatus.APPROVED,
                claim_amount=asset["balance"],
                form_url=f"/reports/claim/{claim_id_str}.pdf",
                created_at=datetime.utcnow()
            )
            self.db.add(new_claim)
            claims.append({
                "claim_id": claim_id_str,
                "institution": asset["institution"],
                "category": asset["category"],
                "amount": asset["balance"],
                "status": "APPROVED",
                "settlement_timeline": "3 to 5 Business Days via Direct UPI / NEFT"
            })

        self.db.commit()

        return {
            "status": "SUCCESSION_RESCUE_ACTIVE",
            "deceased_worker": death_info["deceased_name"],
            "certificate_number": death_info["certificate_number"],
            "total_aggregated_assets": aa_data["total_aggregated_value"],
            "claims_generated": len(claims),
            "claims": claims
        }
