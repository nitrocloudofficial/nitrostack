import pytest
import os
from database.db import Base, engine, SessionLocal
from database import crud
from utils.helpers import hash_password, verify_password, create_access_token, decode_access_token
from utils.validators import is_supported_file, sanitize_text, validate_query
from agents.planner import run_planner
from agents.risk import run_risk_analysis

@pytest.fixture(scope="module")
def db_session():
    """Sets up a temporary SQLite in-memory database for testing."""
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_password_cryptography():
    """Tests password hashing and verification."""
    password = "SecurePassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_tokens():
    """Tests JWT access token creation and decoding."""
    data = {"sub": "test_user_agent"}
    token = create_access_token(data)
    assert token is not None
    payload = decode_access_token(token)
    assert payload is not None
    assert payload.get("sub") == "test_user_agent"

def test_validators():
    """Tests file extensions, email patterns, and text sanitizers."""
    assert is_supported_file("agreement.pdf") is True
    assert is_supported_file("notes.txt") is True
    assert is_supported_file("exploit.exe") is False
    
    assert sanitize_text("Line 1\nLine 2\tDouble   Space") == "Line 1 Line 2 Double Space"
    
    with pytest.raises(ValueError):
        validate_query("")
        
    assert validate_query("  Verify Vendor ABC  ") == "Verify Vendor ABC"

def test_planner_heuristics():
    """Tests that the planner fallback outlines steps and targets."""
    query = "Should we approve Vendor Acme?"
    docs = [{"id": 1, "filename": "acme_spec.pdf", "file_type": "application/pdf"}]
    plan = run_planner(query, docs)
    assert plan["target_entity"] == "Acme"
    assert len(plan["verification_steps"]) > 0
    assert 1 in plan["primary_document_ids"]

def test_risk_scoring():
    """Tests the risk score calculations."""
    evidence = [
        {"doc_id": 1, "entity": "Budget", "category": "Budget", "value": "$500,000", "credibility_score": 0.85}
    ]
    conflicts = [
        {
            "conflict_type": "policy_violation",
            "severity": "high",
            "description": "Blacklisted vendor flagged in system."
        }
    ]
    risks = run_risk_analysis(evidence, conflicts)
    assert risks["overall_risk_score"] > 20
    assert risks["compliance_risk"] > 30
    assert len(risks["reasons"]) > 0

def test_database_crud(db_session):
    """Tests basic user and document SQL operations."""
    db = db_session
    # Test Create User
    u = crud.create_user(db, "test_admin", "test_admin@verichain.ai", "pw_hash", "admin")
    assert u.id is not None
    assert u.username == "test_admin"
    
    # Test Retrieve User
    retrieved = crud.get_user_by_username(db, "test_admin")
    assert retrieved.email == "test_admin@verichain.ai"
    
    # Test Create Document
    doc = crud.create_document(db, u.id, "test_spec.pdf", "/app/uploads/test_spec.pdf", "application/pdf", 1234)
    assert doc.id is not None
    
    # Delete doc
    success = crud.delete_document(db, doc.id)
    assert success is True
    assert crud.get_document_by_id(db, doc.id) is None
