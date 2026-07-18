import sys
import os
from mcp.server.fastmcp import FastMCP

# Ensure the root project directory is in PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend import db

mcp = FastMCP("Hostel")

@mcp.resource("hostel://student/{student_id}")
def get_hostel_resource(student_id: str) -> str:
    """
    Retrieve raw hostel registration details for a student.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    details = db.get_hostel(student_id)
    return str(details)

@mcp.tool()
def get_hostel_details(student_id: str) -> dict:
    """
    Retrieve details about the student's room assignment and outstanding hostel dues.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    return db.get_hostel(student_id)

@mcp.tool()
def get_leave_policy() -> dict:
    """
    Get the campus hostel leave and weekend outpass policy.
    """
    return {
        "policy": "Weekend outpass requests are automatically approved if: 1. Student overall attendance is >= 75%. 2. Student has no unpaid hostel dues. 3. Student has no active/open hostel disciplinary complaints.",
        "max_duration_days": 3,
        "curfew_time": "21:00"
    }

@mcp.tool()
def file_outpass_request(student_id: str, from_date: str, to_date: str, reason: str = "Personal Work") -> dict:
    """
    Submit a weekend outpass leave request.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    - from_date: Start date of outpass (YYYY-MM-DD format).
    - to_date: End date of outpass (YYYY-MM-DD format).
    - reason: The explanation for the outpass.
    """
    # Create the outpass request
    req = db.file_outpass_request(student_id, from_date, to_date, reason)
    return {
        "status": "Success",
        "message": f"Successfully filed outpass request {req['id']} for student {student_id}.",
        "request": req
    }

if __name__ == "__main__":
    mcp.run()
