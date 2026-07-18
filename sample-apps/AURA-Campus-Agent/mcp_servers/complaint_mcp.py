import sys
import os
from mcp.server.fastmcp import FastMCP

# Ensure the root project directory is in PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend import db

mcp = FastMCP("Complaints")

@mcp.resource("complaints://student/{student_id}")
def get_complaints_resource(student_id: str) -> str:
    """
    Retrieve raw complaints filed by a student.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    records = db.get_complaints(student_id)
    return str(records)

@mcp.tool()
def get_complaints(student_id: str, status: str = None) -> list:
    """
    Get complaints filed by a student, optionally filtered by status.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    - status: Optional status filter ('Open' or 'Resolved').
    """
    records = db.get_complaints(student_id)
    if status:
        return [r for r in records if r["status"].lower() == status.lower()]
    return records

@mcp.tool()
def file_complaint(student_id: str, category: str, description: str) -> dict:
    """
    File a new complaint or grievance.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    - category: The department/category ('Hostel', 'Academic', 'Finance', 'Library', 'General').
    - description: The detailed explanation of the complaint.
    """
    new_complaint = db.file_complaint(student_id, category, description)
    return {
        "status": "Success",
        "message": f"Complaint filed successfully with ID {new_complaint['complaint_id']}. Complaint received and we will fix it as soon as possible.",
        "complaint": new_complaint
    }

@mcp.tool()
def resolve_complaint(complaint_id: str) -> dict:
    """
    Resolve an active complaint.
    
    Parameters:
    - complaint_id: The unique complaint ID (e.g. 'C7002').
    """
    resolved = db.resolve_complaint(complaint_id)
    if resolved:
        return {
            "status": "Success",
            "message": f"Complaint {complaint_id} resolved.",
            "complaint": resolved
        }
    return {
        "status": "Error",
        "message": f"Complaint {complaint_id} not found."
    }

if __name__ == "__main__":
    mcp.run()
