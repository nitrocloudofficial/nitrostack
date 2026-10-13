from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Student, Team
from ..schemas import TeamCreate, TeamResponse

router = APIRouter()

# Skill areas we check team coverage against
SKILL_CATEGORIES = {
    "frontend": ["react", "vue", "angular", "html", "css", "javascript", "frontend"],
    "backend": ["fastapi", "django", "flask", "node", "express", "backend", "api"],
    "ml": ["machine learning", "ml", "tensorflow", "pytorch", "scikit-learn", "ai", "nlp"],
    "design": ["ui/ux", "figma", "design", "ui", "ux"],
    "devops": ["docker", "kubernetes", "aws", "devops", "ci/cd", "deployment"],
    "database": ["sql", "postgresql", "mongodb", "database", "sqlite"],
}


def _get_team_or_404(team_id: int, db: Session) -> Team:
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


def _get_members(team: Team, db: Session) -> List[Student]:
    if not team.member_ids:
        return []
    return db.query(Student).filter(Student.id.in_(team.member_ids)).all()


def _matches_category(student_skills: List[str], keywords: List[str]) -> bool:
    skills_lower = [s.lower() for s in student_skills]
    return any(any(kw in skill for kw in keywords) for skill in skills_lower)


@router.post("/teams", response_model=TeamResponse)
def create_team(team: TeamCreate, db: Session = Depends(get_db)):
    # Validate all member_ids actually exist
    found = db.query(Student).filter(Student.id.in_(team.member_ids)).count()
    if found != len(team.member_ids):
        raise HTTPException(status_code=400, detail="One or more student IDs do not exist")

    new_team = Team(**team.model_dump())
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    return new_team


@router.get("/teams/{team_id}", response_model=TeamResponse)
def get_team(team_id: int, db: Session = Depends(get_db)):
    return _get_team_or_404(team_id, db)


@router.get("/teams/{team_id}/compatibility")
def compatibility_score(team_id: int, db: Session = Depends(get_db)):
    """
    Compatibility score based on how much the team's SKILLS, AVAILABILITY,
    and INTERESTS overlap with each other (pairwise average).
    """
    team = _get_team_or_404(team_id, db)
    members = _get_members(team, db)

    if len(members) < 2:
        return {
            "skill_match": 0,
            "availability_match": 0,
            "interest_match": 0,
            "overall": 0,
            "note": "Need at least 2 members to calculate compatibility",
        }

    pair_scores = []
    for i in range(len(members)):
        for j in range(i + 1, len(members)):
            a, b = members[i], members[j]

            skill_overlap = len(set(a.skills) & set(b.skills))
            skill_union = len(set(a.skills) | set(b.skills)) or 1
            skill_match = round((skill_overlap / skill_union) * 100, 1)

            avail_overlap = len(set(a.availability) & set(b.availability))
            avail_union = len(set(a.availability) | set(b.availability)) or 1
            availability_match = round((avail_overlap / avail_union) * 100, 1)

            interest_overlap = len(set(a.interests) & set(b.interests))
            interest_union = len(set(a.interests) | set(b.interests)) or 1
            interest_match = round((interest_overlap / interest_union) * 100, 1)

            pair_scores.append((skill_match, availability_match, interest_match))

    avg_skill = round(sum(p[0] for p in pair_scores) / len(pair_scores), 1)
    avg_avail = round(sum(p[1] for p in pair_scores) / len(pair_scores), 1)
    avg_interest = round(sum(p[2] for p in pair_scores) / len(pair_scores), 1)
    overall = round(avg_skill * 0.5 + avg_avail * 0.25 + avg_interest * 0.25, 1)

    return {
        "skill_match": avg_skill,
        "availability_match": avg_avail,
        "interest_match": avg_interest,
        "overall": overall,
    }


@router.get("/teams/{team_id}/analyze")
def analyze_team(team_id: int, db: Session = Depends(get_db)):
    """
    Checks which key skill categories (frontend, backend, ML, design,
    devops, database) the team does NOT currently have covered.
    """
    team = _get_team_or_404(team_id, db)
    members = _get_members(team, db)

    covered = set()
    for student in members:
        for category, keywords in SKILL_CATEGORIES.items():
            if _matches_category(student.skills, keywords):
                covered.add(category)

    missing = [cat for cat in SKILL_CATEGORIES if cat not in covered]

    return {
        "team_id": team_id,
        "member_count": len(members),
        "covered_categories": sorted(covered),
        "missing_skills": missing,
    }


@router.get("/teams/{team_id}/assign-roles")
def assign_roles(team_id: int, db: Session = Depends(get_db)):
    """
    Assigns each member to the skill category they match strongest,
    preferring higher-experience members if there's a conflict.
    """
    team = _get_team_or_404(team_id, db)
    members = _get_members(team, db)

    if not members:
        return {"roles": {}, "note": "Team has no members yet"}

    experience_rank = {"beginner": 0, "intermediate": 1, "advanced": 2}
    roles = {}
    assigned_students = set()

    for category, keywords in SKILL_CATEGORIES.items():
        candidates = [
            s for s in members
            if s.id not in assigned_students and _matches_category(s.skills, keywords)
        ]
        if candidates:
            best = max(candidates, key=lambda s: experience_rank.get(s.experience_level, 0))
            roles[category] = best.name
            assigned_students.add(best.id)

    unassigned = [s.name for s in members if s.id not in assigned_students]
    if unassigned:
        roles["general_contributor"] = ", ".join(unassigned)

    return {"team_id": team_id, "roles": roles}


@router.get("/teams/{team_id}/task-plan")
def generate_task_plan(
    team_id: int,
    project_type: str = Query(default="general"),
    db: Session = Depends(get_db),
):
    """
    Returns a 3-day task plan template based on project type.
    Rule-based (not LLM-generated) so it's fast and deterministic.
    """
    _get_team_or_404(team_id, db)  # confirms team exists

    templates = {
        "web app": {
            "day1": ["Set up repo & environments", "Design UI wireframes", "Set up backend skeleton"],
            "day2": ["Build core frontend components", "Build core API endpoints", "Connect frontend to backend"],
            "day3": ["Integration testing", "Bug fixes", "Polish UI", "Prepare demo"],
        },
        "ml model": {
            "day1": ["Data collection & cleaning", "Exploratory data analysis", "Set up project structure"],
            "day2": ["Model training & tuning", "Build simple API to serve predictions", "Build basic UI"],
            "day3": ["Evaluate model accuracy", "Integration", "Prepare demo & results visualization"],
        },
        "mobile app": {
            "day1": ["Set up mobile project", "Design screens", "Set up backend API"],
            "day2": ["Build core screens", "Connect to backend", "Add navigation"],
            "day3": ["Testing on devices", "Bug fixes", "Prepare demo"],
        },
        "general": {
            "day1": ["Finalize idea & requirements", "Set up repo & environments", "Assign roles"],
            "day2": ["Core feature development", "Regular integration checks"],
            "day3": ["Testing & bug fixing", "Polish", "Prepare demo & presentation"],
        },
    }

    plan = templates.get(project_type.lower(), templates["general"])
    return {"team_id": team_id, "project_type": project_type, **plan}