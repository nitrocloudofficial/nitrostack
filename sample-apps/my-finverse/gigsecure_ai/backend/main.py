import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.config import settings
from backend.database import engine, Base

# Import Routers
from backend.auth.auth_routes import router as auth_router
from backend.routers.users import router as users_router
from backend.routers.profile import router as profile_router
from backend.routers.credit import router as credit_router
from backend.routers.loan import router as loan_router
from backend.routers.repayment import router as repayment_router
from backend.routers.fraud import router as fraud_router
from backend.routers.invoice import router as invoice_router
from backend.routers.verification import router as verification_router
from backend.routers.nominee import router as nominee_router
from backend.routers.succession import router as succession_router
from backend.routers.reports import router as reports_router
from backend.routers.notifications import router as notifications_router
from backend.routers.analytics import router as analytics_router
from backend.routers.admin import router as admin_router

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise AI-Powered FinTech Ecosystem for Gig Workers in India"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create Database Tables
Base.metadata.create_all(bind=engine)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

# Include Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profile_router)
app.include_router(credit_router)
app.include_router(loan_router)
app.include_router(repayment_router)
app.include_router(fraud_router)
app.include_router(invoice_router)
app.include_router(verification_router)
app.include_router(nominee_router)
app.include_router(succession_router)
app.include_router(reports_router)
app.include_router(notifications_router)
app.include_router(analytics_router)
app.include_router(admin_router)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "rbi_sandbox_mode": True,
        "sha256_ledger_active": True
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
