from sqlalchemy.orm import Session
from backend.models.domain_models import Asset
from backend.services.account_aggregator_service import AccountAggregatorService
from datetime import datetime

class AssetService:
    def __init__(self, db: Session):
        self.db = db

    def sync_account_aggregator_assets(self, user_id: int, aadhaar_number: str) -> dict:
        aa_data = AccountAggregatorService.discover_all_assets(aadhaar_number)

        # Save discovered assets into DB
        for item in aa_data["assets"]:
            asset_record = Asset(
                user_id=user_id,
                asset_type=item["category"],
                institution_name=item["institution"],
                account_identifier=item["account_number"],
                estimated_value=item["balance"],
                status="ACTIVE",
                created_at=datetime.utcnow()
            )
            self.db.add(asset_record)
        self.db.commit()

        return aa_data
