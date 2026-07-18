import sys
import os
from mcp.server.fastmcp import FastMCP

# Ensure the root project directory is in PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend import db

mcp = FastMCP("Finance")

@mcp.resource("finance://student/{student_id}")
def get_finance_resource(student_id: str) -> str:
    """
    Retrieve raw financial dues and statements for a student.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    records = db.get_finance(student_id)
    return str(records)

@mcp.tool()
def get_finance_dues(student_id: str) -> list:
    """
    Get all outstanding dues and payments for a student.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    return db.get_finance(student_id)

@mcp.tool()
def pay_fees(student_id: str, fee_type: str, amount: float) -> dict:
    """
    Simulate a fee payment.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    - fee_type: The type of fee (e.g. 'Tuition', 'Hostel').
    - amount: The payment amount (must be positive).
    """
    if amount <= 0:
        return {"status": "Error", "message": "Amount must be greater than zero."}
    
    record = db.pay_finance_fees(student_id, fee_type, amount)
    if record:
        remaining = record["amount_due"] - record["amount_paid"]
        return {
            "status": "Success",
            "message": f"Successfully processed payment of {amount} for {fee_type}.",
            "record": record,
            "remaining_due": max(0.0, remaining)
        }
    return {
        "status": "Error",
        "message": f"No fee record found of type '{fee_type}' for student '{student_id}'."
    }

if __name__ == "__main__":
    mcp.run()
