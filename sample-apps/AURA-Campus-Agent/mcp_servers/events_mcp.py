import sys
import os
from mcp.server.fastmcp import FastMCP

# Ensure the root project directory is in PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend import db

mcp = FastMCP("Events")

@mcp.resource("events://student/{student_id}")
def get_events_resource(student_id: str) -> str:
    """
    Retrieve list of events highlighting the registration status for a student.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    events = db.get_events()
    registered = []
    for e in events:
        if student_id in e.get("registered_students", []):
            registered.append(e)
    return str({"registered_events": registered, "all_events": events})

@mcp.tool()
def get_upcoming_events() -> list:
    """
    Get all scheduled upcoming campus events.
    """
    return db.get_events()

@mcp.tool()
def register_for_event(student_id: str, event_id: str) -> dict:
    """
    Register a student for a campus event.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    - event_id: The unique event ID (e.g. 'E3002').
    """
    event = db.register_event(student_id, event_id)
    if event:
        return {
            "status": "Success",
            "message": f"Successfully registered student {student_id} for event '{event['title']}'.",
            "event": event
        }
    return {
        "status": "Error",
        "message": f"Event {event_id} not found."
    }

if __name__ == "__main__":
    mcp.run()
