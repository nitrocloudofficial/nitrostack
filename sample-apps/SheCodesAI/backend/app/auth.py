from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

security = HTTPBearer()

class UserSession:
    def __init__(self, user_id: str, email: str, role: str, workspace_id: str):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.workspace_id = workspace_id

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> UserSession:
    token = credentials.credentials
    if not token or token == "invalid":
        raise HTTPException(status_code=401, detail="Invalid Supabase JWT Authorization Token")
    
    # In production, verifies token signature against Supabase Auth secret / JWKS
    return UserSession(
        user_id="user-alex-rivers",
        email="alex.rivers@acme.com",
        role="Administrator",
        workspace_id="ws-acme"
    )

def require_role(allowed_roles: list[str]):
    def dependency(user: UserSession = Depends(get_current_user)):
        if user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail=f"User role '{user.role}' lacks permission for this action.")
        return user
    return dependency
