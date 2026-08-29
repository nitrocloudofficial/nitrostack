from dataclasses import dataclass

@dataclass
class User:
    id: int

def parse_user(payload: dict) -> User:
    user_id: int = payload["id"]
    return User(id=user_id)
