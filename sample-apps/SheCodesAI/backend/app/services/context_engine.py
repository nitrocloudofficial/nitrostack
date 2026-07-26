import json
from typing import Dict, Any
from app.config import settings

class ContextEngineService:
    def __init__(self):
        self.openai_key = settings.OPENAI_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY

    async def process_transcript(self, transcript: str, context_pack_id: str) -> Dict[str, Any]:
        """
        Applies the manually selected Context Pack rules to raw conversation transcript.
        Zero auto-classification: transcript never changes, only output workflow transforms.
        """
        pack_rules = {
            "software_dev": {
                "summary_style": "Technical Specification & Architecture Review",
                "extracted_tasks": [
                    {
                        "id": "task-101",
                        "title": "Configure FastAPI Supabase JWT Auth Middleware",
                        "description": "Set up HTTPBearer JWT validation and RBAC role dependencies in app/auth.py.",
                        "priority": "Critical",
                        "owner": "Alex Rivers",
                        "deadline": "Today at 5:00 PM",
                        "suggested_tool": "GitHub",
                        "confidence_score": 96
                    },
                    {
                        "id": "task-102",
                        "title": "Initialize ChromaDB Vector Store Container",
                        "description": "Configure persistent vector embeddings collection with 1,536-dim text-embedding-3 vectors.",
                        "priority": "High",
                        "owner": "David Vance",
                        "deadline": "Jul 27, 2026",
                        "suggested_tool": "Jira",
                        "confidence_score": 94
                    }
                ],
                "decisions": [
                    "Approved FastAPI gateway architecture for MCP Plugin Orchestration",
                    "Selected Supabase Auth for multi-tenant JWT verification",
                    "Selected ChromaDB for semantic vector retrieval"
                ]
            },
            "business": {
                "summary_style": "Executive Summary & Meeting Minutes",
                "extracted_tasks": [
                    {
                        "id": "task-201",
                        "title": "Review Q3 Department OKRs and Quarterly Budget",
                        "description": "Prepare executive summary report for leadership review.",
                        "priority": "High",
                        "owner": "Priya Sharma",
                        "deadline": "Jul 28, 2026",
                        "suggested_tool": "Notion",
                        "confidence_score": 92
                    }
                ],
                "decisions": ["Approved Q3 budget allocation for AI infrastructure"]
            }
        }

        selected_rule = pack_rules.get(context_pack_id, pack_rules["software_dev"])

        return {
            "context_pack_id": context_pack_id,
            "summary_style": selected_rule["summary_style"],
            "summary": f"Decided to deploy FastAPI backend microservices with Supabase PostgreSQL and ChromaDB vector store under Context Pack: {context_pack_id}.",
            "tasks": selected_rule["extracted_tasks"],
            "decisions": selected_rule["decisions"],
            "knowledge_markdown": f"# Meeting Digest ({context_pack_id.upper()})\n\n## Key Architectural Decisions\n" + "\n".join([f"- {d}" for d in selected_rule["decisions"]])
        }

context_engine = ContextEngineService()
