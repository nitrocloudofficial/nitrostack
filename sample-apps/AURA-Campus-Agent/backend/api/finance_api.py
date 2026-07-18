from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend import db

router = APIRouter(prefix="/finance", tags=["Finance"])

class PayFeesPayload(BaseModel):
    fee_type: str
    amount: float

@router.get("/{student_id}")
def get_finance(student_id: str):
    return db.get_finance(student_id)

@router.post("/{student_id}/pay")
def pay_fees(student_id: str, payload: PayFeesPayload):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")
    res = db.pay_finance_fees(student_id, payload.fee_type, payload.amount)
    if not res:
        raise HTTPException(status_code=404, detail="Fee account not found")
    return res
