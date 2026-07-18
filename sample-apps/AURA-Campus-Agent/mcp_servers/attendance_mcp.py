import sys
import os
from mcp.server.fastmcp import FastMCP

# Ensure the root project directory is in PYTHONPATH for importing backend.db
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend import db

mcp = FastMCP("Attendance")

@mcp.resource("attendance://student/{student_id}")
def get_attendance_resource(student_id: str) -> str:
    """
    Retrieve raw attendance data for a student.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    records = db.get_attendance(student_id)
    return str(records)

@mcp.tool()
def get_attendance_percentage(student_id: str, course_code: str = None) -> float:
    """
    Get the attendance percentage of a student.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    - course_code: Optional. The course code (e.g. 'CS301') to check. If omitted, returns the overall average percentage.
    """
    records = db.get_attendance(student_id)
    if not records:
        return 0.0
    if course_code:
        for r in records:
            if r["course_code"].lower() == course_code.lower():
                return float(r["percentage"])
        return 0.0
    return round(sum(r["percentage"] for r in records) / len(records), 2)

@mcp.tool()
def get_low_attendance_courses(student_id: str, threshold: float = 75.0) -> list:
    """
    Retrieve list of courses where attendance falls below a specified percentage.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    - threshold: The attendance percentage threshold (e.g. 75.0).
    """
    records = db.get_attendance(student_id)
    return [r for r in records if r["percentage"] < threshold]

@mcp.tool()
def flag_attendance_shortage(student_id: str, course_code: str) -> dict:
    """
    Flag attendance shortage for a student in a course by automatically filing a system complaint.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    - course_code: The course code with low attendance (e.g. 'CS302').
    """
    desc = f"System flagged attendance shortage in {course_code} for student {student_id}."
    complaint = db.file_complaint(student_id, "Academic", desc)
    return {
        "status": "Flagged",
        "message": f"Successfully filed shortage warning for {course_code}.",
        "complaint_id": complaint["complaint_id"]
    }

if __name__ == "__main__":
    mcp.run()
