from sqlalchemy.orm import Session
from backend.models.domain_models import User, GigProfile
from typing import Optional

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_by_phone(self, phone: str) -> Optional[User]:
        return self.db.query(User).filter(User.phone == phone).first()

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User) -> User:
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_gig_profile(self, user_id: int) -> Optional[GigProfile]:
        return self.db.query(GigProfile).filter(GigProfile.user_id == user_id).first()

    def create_or_update_gig_profile(self, profile: GigProfile) -> GigProfile:
        self.db.merge(profile)
        self.db.commit()
        return profile
