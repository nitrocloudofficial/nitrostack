import sys
import os
from mcp.server.fastmcp import FastMCP

# Ensure the root project directory is in PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend import db

mcp = FastMCP("Placement")

@mcp.resource("placements://student/{student_id}")
def get_placement_resource(student_id: str) -> str:
    """
    Retrieve raw placement profile (CGPA, backlogs, applied jobs) for a student.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    profile = db.get_placement(student_id)
    return str(profile)

@mcp.tool()
def get_placement_profile(student_id: str) -> dict:
    """
    Retrieve the student's placement profile metrics (CGPA, active backlogs, applications).
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    """
    profile = db.get_placement(student_id)
    if profile:
        return profile
    return {"student_id": student_id, "cgpa": 0.0, "backlogs": 0, "eligible_companies": [], "applications": []}

@mcp.tool()
def get_eligibility_criteria(company_name: str) -> dict:
    """
    Retrieve company-specific recruitment cutoff parameters (minimum CGPA, allowed backlogs).
    
    Parameters:
    - company_name: Name of the corporate recruiter (e.g. 'Google', 'Microsoft', 'Uber').
    """
    criteria = {
        "google": {"min_cgpa": 8.0, "max_backlogs": 0},
        "microsoft": {"min_cgpa": 7.8, "max_backlogs": 0},
        "uber": {"min_cgpa": 8.0, "max_backlogs": 0},
        "tcs": {"min_cgpa": 6.0, "max_backlogs": 2},
        "infosys": {"min_cgpa": 6.0, "max_backlogs": 2}
    }
    name_lower = company_name.lower()
    return criteria.get(name_lower, {"min_cgpa": 6.5, "max_backlogs": 1})

@mcp.tool()
def apply_for_company(student_id: str, company_name: str) -> dict:
    """
    Submit an application for a company placement drive.
    
    Parameters:
    - student_id: The unique string ID of the student (e.g. 'S1001').
    - company_name: Recruiter company name (e.g. 'Google').
    """
    profile = db.get_placement(student_id)
    if not profile:
        return {"status": "Error", "message": "Placement profile not found."}
    
    # Check eligibility
    criteria = get_eligibility_criteria(company_name)
    if profile["cgpa"] < criteria["min_cgpa"]:
        return {
            "status": "Rejected",
            "message": f"Ineligible. Minimum CGPA required: {criteria['min_cgpa']}, Student CGPA: {profile['cgpa']}."
        }
    if profile["backlogs"] > criteria["max_backlogs"]:
        return {
            "status": "Rejected",
            "message": f"Ineligible. Maximum backlogs allowed: {criteria['max_backlogs']}, Student active backlogs: {profile['backlogs']}."
        }
    
    updated = db.apply_placement(student_id, company_name)
    return {
        "status": "Success",
        "message": f"Successfully registered placement application for {company_name}.",
        "profile": updated
    }

if __name__ == "__main__":
    mcp.run()
