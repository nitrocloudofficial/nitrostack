import os
import sys
import json
import argparse
from typing import List

# Ensure the root of the project is in the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.db import SessionLocal
from database import crud
from services.agent_orchestrator import orchestrate_decision_flow
from services.pdf_generator import generate_pdf_report
from agents.risk import run_risk_analysis
from utils.logger import logger

def main():
    parser = argparse.ArgumentParser(description="VeriChain AI Agent Execution Bridge")
    parser.add_argument("--user-id", type=int, required=True, help="User ID initiating the request")
    parser.add_argument("--query", type=str, required=True, help="Evaluation query context")
    parser.add_argument("--doc-ids", type=str, required=True, help="Comma-separated target document IDs")
    
    args = parser.parse_args()
    
    # Parse document IDs
    try:
        doc_ids = [int(x.strip()) for x in args.doc_ids.split(",") if x.strip()]
    except Exception as e:
        print(json.dumps({"error": f"Invalid document IDs argument: {e}"}))
        sys.exit(1)
        
    if not doc_ids:
        print(json.dumps({"error": "No document IDs specified"}))
        sys.exit(1)
        
    db = SessionLocal()
    try:
        # Resolve documents
        documents = []
        for d_id in doc_ids:
            doc = crud.get_document_by_id(db, d_id)
            if not doc:
                print(json.dumps({"error": f"Document ID {d_id} not found in database"}))
                sys.exit(1)
            documents.append(doc)
            
        # Run LangGraph Orchestration Flow
        logger.info(f"CLI Bridge: Starting orchestrator for query: '{args.query}' on {len(documents)} documents")
        decision = orchestrate_decision_flow(
            db=db,
            user_id=args.user_id,
            query=args.query,
            documents=documents
        )
        
        # Gather all evidence for all involved documents to run risk analysis
        all_evidence = []
        for doc in documents:
            all_evidence.extend(crud.get_evidence_by_doc(db, doc.id))
            
        conflicts = crud.get_conflicts_by_decision(db, decision.id)
        
        # Run risk analysis
        risks = run_risk_analysis(
            [{"doc_id": ev.doc_id, "entity": ev.entity, "claim": ev.claim, "category": ev.category, "value": ev.value} for ev in all_evidence],
            [{"description": c.description, "severity": c.severity, "conflict_type": c.conflict_type} for c in conflicts]
        )
        
        # Generate the PDF report
        pdf_path = generate_pdf_report(decision, all_evidence, conflicts, risks)
        
        # Check if report record already exists, if not create it
        reports = crud.get_reports_by_decision(db, decision.id)
        pdf_report = next((r for r in reports if r.format.upper() == "PDF"), None)
        if not pdf_report:
            crud.create_report(db, decision_id=decision.id, file_path=pdf_path, format="PDF")
            
        # Return success with decision ID
        result = {
            "success": True,
            "decision_id": decision.id,
            "status": decision.decision_status,
            "confidence": decision.confidence_score
        }
        print(json.dumps(result))
        
    except Exception as e:
        logger.error(f"CLI Bridge: Agent flow failed: {e}")
        print(json.dumps({"error": f"Agent flow run encountered an error: {str(e)}"}))
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
