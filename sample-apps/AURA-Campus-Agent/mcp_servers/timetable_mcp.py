import sys
import os
from mcp.server.fastmcp import FastMCP

# Ensure the root project directory is in PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend import db

mcp = FastMCP("Timetable")

@mcp.resource("timetable://student/{student_id}")
def get_timetable_resource(student_id: str) -> str:
    """
    Retrieve raw timetable slots matching the student's enrolled courses.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    records = db.get_timetable(student_id)
    return str(records)

@mcp.tool()
def get_schedule(student_id: str, day: str = None) -> list:
    """
    Get the class schedule for a student, optionally filtered by day of the week.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    - day: Optional. The day of the week to filter schedule (e.g. 'Monday', 'Tuesday').
    """
    schedule = db.get_timetable(student_id)
    if day:
        return [item for item in schedule if item["day"].lower() == day.lower()]
    return schedule

@mcp.tool()
def update_class_schedule(course_code: str, day: str, start_time: str, end_time: str, room: str, faculty: str = None) -> dict:
    """
    Update class timing or location for a course, simulating admin scheduler tools.
    
    Parameters:
    - course_code: The course code to update (e.g. 'CS301').
    - day: The day of the week (e.g. 'Monday').
    - start_time: Start time in 24h format (e.g. '09:00').
    - end_time: End time in 24h format (e.g. '10:30').
    - room: The classroom code (e.g. 'LHC-101').
    - faculty: Optional name of the professor.
    """
    success = db.update_timetable_schedule(course_code, day, start_time, end_time, room, faculty)
    if success:
        return {
            "status": "Success",
            "message": f"Successfully updated schedule for {course_code} on {day} to {start_time}-{end_time} in {room}."
        }
    return {"status": "Error", "message": "Failed to update schedule."}

if __name__ == "__main__":
    mcp.run()
