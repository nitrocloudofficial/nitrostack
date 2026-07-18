import sys
import os
from mcp.server.fastmcp import FastMCP

# Ensure the root project directory is in PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend import db

mcp = FastMCP("Profile")

@mcp.resource("profile://student/{student_id}")
def get_profile_resource(student_id: str) -> str:
    """
    Retrieve raw contact profile information for a student.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    profile = db.get_profile(student_id)
    return str(profile)

@mcp.tool()
def get_student_profile(student_id: str) -> dict:
    """
    Get full profile details for a student, including personal and emergency contact information.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    profile = db.get_profile(student_id)
    student = db.get_student(student_id)
    if profile and student:
        return {**student, **profile}
    elif student:
        return student
    return {}

@mcp.tool()
def update_student_profile(student_id: str, email: str = None, phone: str = None, address: str = None) -> dict:
    """
    Update profile contact credentials.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    - email: Optional. New email address.
    - phone: Optional. New phone number.
    - address: Optional. New residential address.
    """
    updated = db.update_profile(student_id, email, phone, address)
    if updated:
        return {
            "status": "Success",
            "message": f"Successfully updated contact profile for student {student_id}.",
            "profile": updated
        }
    return {"status": "Error", "message": "Failed to update profile. Profile record not found."}

if __name__ == "__main__":
    mcp.run()
