import sys
import os
from mcp.server.fastmcp import FastMCP

# Ensure the root project directory is in PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend import db

mcp = FastMCP("Library")

@mcp.resource("library://student/{student_id}")
def get_library_resource(student_id: str) -> str:
    """
    Retrieve raw library checkout logs for a student.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    records = db.get_library(student_id)
    return str(records)

@mcp.tool()
def get_borrowed_books(student_id: str) -> list:
    """
    Get all active book issues (unreturned books) for a student.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    records = db.get_library(student_id)
    return [r for r in records if not r["returned"]]

@mcp.tool()
def get_library_dues(student_id: str) -> float:
    """
    Get total outstanding library fines for a student.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    records = db.get_library(student_id)
    return float(sum(r.get("fine", 0.0) for r in records))

@mcp.tool()
def issue_book(student_id: str, book_id: str, book_title: str, due_date: str) -> dict:
    """
    Borrow a library book.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    - book_id: Unique string catalog code of the book (e.g. 'B9013').
    - book_title: Title of the book.
    - due_date: Due date for return (YYYY-MM-DD format).
    """
    record = db.issue_book(student_id, book_id, book_title, due_date)
    return {
        "status": "Success",
        "message": f"Successfully issued '{book_title}' to student {student_id}.",
        "record": record
    }

@mcp.tool()
def return_book(student_id: str, book_id: str) -> dict:
    """
    Return a library book.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    - book_id: Unique string catalog code of the book (e.g. 'B9012').
    """
    record = db.return_book(student_id, book_id)
    if record:
        return {
            "status": "Success",
            "message": f"Successfully returned book {book_id} and cleared outstanding fines.",
            "record": record
        }
    return {
        "status": "Error",
        "message": f"No active issue record found for book {book_id} borrowed by student {student_id}."
    }

if __name__ == "__main__":
    mcp.run()
