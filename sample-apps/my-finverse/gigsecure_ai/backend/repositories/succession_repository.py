from sqlalchemy.orm import Session
from backend.models.domain_models import Nominee, Asset, Claim
from typing import List, Optional

class SuccessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_nominee(self, nominee: Nominee) -> Nominee:
        self.db.add(nominee)
        self.db.commit()
        self.db.refresh(nominee)
        return nominee

    def get_nominee_by_user(self, user_id: int) -> Optional[Nominee]:
        return self.db.query(Nominee).filter(Nominee.user_id == user_id).first()

    def get_user_by_aadhaar(self, aadhaar: str):
        from backend.models.domain_models import User
        return self.db.query(User).filter(User.aadhaar_number == aadhaar).first()

    def get_assets_by_user(self, user_id: int) -> List[Asset]:
        return self.db.query(Asset).filter(Asset.user_id == user_id).all()

    def create_asset(self, asset: Asset) -> Asset:
        self.db.add(asset)
        self.db.commit()
        self.db.refresh(asset)
        return asset

    def create_claim(self, claim: Claim) -> Claim:
        self.db.add(claim)
        self.db.commit()
        self.db.refresh(claim)
        return claim

    def get_claims_all(self) -> List[Claim]:
        return self.db.query(Claim).order_by(Claim.created_at.desc()).all()
