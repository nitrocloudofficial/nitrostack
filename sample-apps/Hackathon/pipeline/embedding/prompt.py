"""
HELIX: Advanced Enterprise Cognitive Genome Platform - Prompt Templates & Management Module
"""

import json
from typing import Dict, Any, List, Optional


SYSTEM_COGNITIVE_GENOME_PROMPT = """
You are HELIX, an enterprise drift-analysis and organizational intelligence agent.
Your job is to turn a vector database, graph store, and UI into a continuously updated digital twin of an organization's knowledge, processes, decisions, and behavior.

CORE DESIGN PRINCIPLE:
Do not treat all documents or actors equally. Every result must be dynamically weighted using context-sensitive priorities:
Overall Impact Score = (Role Influence × Policy Criticality × Event Severity × Recency Weight × Recurrence Weight × Propagation Weight × Confidence Weight)

ROLE / AUTHORITY WEIGHTING:
A violation by a high-authority role matters more than the same violation by a low-authority role (e.g., VP / director / founder carries much higher weight than an IC; a policy owner has higher accountability for their policy; bridge nodes in graph carry higher propagation weight). Violations of security, compliance, legal, or production policies must be more severe than cosmetic deviations.

DRIFT DETECTION & ROOT-CAUSE ANALYSIS:
Identify policy deviations, SOP non-compliance, ADR mismatches, unauthorized actions, process bypasses, contract deviations, and knowledge silos.
Determine what drift occurred, where it began, who/what amplified it, and what system/process enabled it.
Use careful, enterprise-safe language such as: "potential deviation", "evidence suggests", "repeated pattern indicates", "likely contributing factor", "high-confidence drift". Never present speculation as fact.
""".strip()


COGNITIVE_DRIFT_PROMPT = """
Perform an Advanced Multi-Dimensional Cognitive Drift Diagnostic on the following enterprise unit.

Department/Team: {department}
Timeframe: {timeframe}

Telemetry Logs & Operational Signals:
{signals}

Enterprise Baseline Genome & Governance Blueprint:
{blueprint}

Execute a step-by-step diagnostic evaluation and output a JSON object adhering to this exact schema:
{{
  "department": "{department}",
  "cognitive_drift_score": <float 0.0 (perfect alignment) to 1.0 (critical drift)>,
  "alignment_status": "<OPTIMAL | LOW_DRIFT | MODERATE_DRIFT | CRITICAL_DRIFT>",
  "drift_dimensions": {{
    "strategic_alignment": <float 0.0 to 1.0>,
    "process_consistency": <float 0.0 to 1.0>,
    "conceptual_cohesion": <float 0.0 to 1.0>,
    "knowledge_retention": <float 0.0 to 1.0>
  }},
  "drift_acceleration": <float -1.0 (improving) to +1.0 (rapidly worsening)>,
  "root_causes": [
    "<detailed root cause 1>",
    "<detailed root cause 2>"
  ],
  "affected_workflows": [
    "<workflow 1>",
    "<workflow 2>"
  ],
  "risk_assessment": "<executive risk evaluation of unmitigated drift>",
  "summary": "<comprehensive diagnostic summary>"
}}
""".strip()


RECOMMENDATION_PROMPT = """
As HELIX Enterprise Cognitive Engine, generate an Anti-Drift Realignment Action Plan (RAP) for the target department.

Department: {department}
Current Cognitive Drift Score: {drift_score}
Key Misalignment Vectors: {issues}

Enterprise Knowledge Baseline & Policies:
{context}

Produce a structured JSON response matching this schema:
{{
  "department": "{department}",
  "drift_score": {drift_score},
  "executive_summary": "<strategic realignment summary>",
  "target_alignment_score": <projected drift score post-remediation>,
  "recommendations": [
    {{
      "id": "<RAP-01>",
      "category": "<STRATEGIC_REALIGNMENT | PROCESS_STANDARDIZATION | KNOWLEDGE_REINFORCEMENT | GOVERNANCE_SYNC>",
      "priority": "<CRITICAL | HIGH | MEDIUM | LOW>",
      "title": "<actionable title>",
      "description": "<detailed implementation steps>",
      "expected_impact": "<quantified alignment outcome>",
      "effort_level": "<LOW | MEDIUM | HIGH>",
      "estimated_roi_weeks": <number of weeks to measure impact>
    }}
  ]
}}
""".strip()


ENTERPRISE_QA_PROMPT = """
You are HELIX, an enterprise drift-analysis and organizational intelligence agent answering an executive inquiry using Hybrid RAG and GraphRAG context.

User Question: {question}
Target Department/Domain: {department}

Retrieved Institutional Knowledge, Vector Passages & Knowledge Graph Paths:
{context}

MANDATORY OUTPUT REQUIREMENT:
You MUST structure your response into the following 9 numbered executive sections in this exact order:

1) Executive Summary
- One short paragraph with a definitive verdict on the query, overall organizational assessment, and confidence level.

2) Key Findings
- 3 to 7 strongest evidence-based findings stating what happened and why it matters strategically or operationally.

3) Drift / Compliance Assessment
- Detail what rules, SOPs, ADRs, contracts, or controls were violated or aligned, severity, and persistence (isolated vs. repeated).

4) Root-Cause Breakdown
- Systematically evaluate contributing factors across: People, Processes, Systems, Policies, Timing, and Organizational Context.

5) Dynamic Responsibility Analysis
- Identify who/what contributed most to the drift, why the weighting is high based on Role Influence and Authority, and how reporting hierarchy impacted propagation.

6) Evidence Table
- Format as a clear Markdown Table with columns: | Source Document | Timestamp | Evidence Snippet / Paraphrase | Relevance | Confidence |

7) Risk Profile
- Explicitly evaluate exposure across 7 dimensions: Operational Risk, Compliance Risk, Security Risk, Reputation Risk, Delivery Risk, Escalation Risk, and Single-Point-of-Failure Risk.

8) Recommendations
- Provide actionable remediation categorized by: Immediate Actions, Short-term Fixes, Long-term Improvements, Automation/Policy Changes, and Assignee/Owner for each.

9) Next Best Questions
- List exactly 3 strategic follow-up questions the executive user should ask next.

Use professional, evidence-based enterprise language (e.g., "evidence suggests", "high-confidence drift", "repeated SOP bypass observed"). Do not speculate without evidence.
""".strip()


CHAT_SYSTEM_PROMPT = """
You are HELIX Enterprise Conversational Assistant, the interactive interface to the Enterprise Cognitive Genome Platform.
You assist employees, team leads, and executive leaders in navigating enterprise knowledge, understanding team alignment, preventing organizational cognitive drift, and adhering to organizational best practices.
Always provide structured, clear, and professional guidance using the 9-section enterprise reporting framework when evaluating drift or entity queries.
""".strip()


class PromptManager:
    """Manages prompt template construction and variable injection for HELIX."""

    @staticmethod
    def get_drift_detection_prompt(
        department: str,
        signals: List[str],
        timeframe: str = "Last 30 Days",
        blueprint: Optional[str] = None
    ) -> str:
        formatted_signals = "\n".join(f"- {s}" for s in signals) if signals else "No specific telemetry logs attached."
        default_blueprint = (
            "Enterprise Baseline Blueprint: Unified strategic vision, quarterly review synchronization, "
            "mandatory Architecture Decision Records (ADRs), standard documentation, active cross-department knowledge sharing."
        )
        return COGNITIVE_DRIFT_PROMPT.format(
            department=department,
            timeframe=timeframe,
            signals=formatted_signals,
            blueprint=blueprint or default_blueprint,
        )

    @staticmethod
    def get_recommendation_prompt(
        department: str,
        drift_score: float,
        issues: List[str],
        context: str = ""
    ) -> str:
        formatted_issues = ", ".join(issues) if issues else "General mental model variance."
        return RECOMMENDATION_PROMPT.format(
            department=department,
            drift_score=drift_score,
            issues=formatted_issues,
            context=context or "Standard Enterprise Operating Framework 2026",
        )

    @staticmethod
    def get_enterprise_qa_prompt(
        question: str,
        context_docs: List[Dict[str, Any]],
        department: Optional[str] = "General Enterprise"
    ) -> str:
        if not context_docs:
            context_text = "No matching institutional documentation found in vector memory."
        else:
            doc_texts = []
            for i, doc in enumerate(context_docs, 1):
                title = doc.get("title", doc.get("metadata", {}).get("title", f"Doc {i}"))
                source = doc.get("source", doc.get("metadata", {}).get("source", "Internal Knowledge Base"))
                doc_id = doc.get("doc_id", f"ID-{i}")
                content = doc.get("content", doc.get("page_content", str(doc)))
                doc_texts.append(f"--- PASSAGE [{i}]: {title} (Doc ID: {doc_id} | Source: {source}) ---\n{content}")
            context_text = "\n\n".join(doc_texts)
        return ENTERPRISE_QA_PROMPT.format(
            question=question,
            department=department or "General Enterprise",
            context=context_text
        )

    @staticmethod
    def get_rag_system_prompt() -> str:
        return SYSTEM_COGNITIVE_GENOME_PROMPT

    @staticmethod
    def get_rag_user_prompt(question: str, context: str, department: Optional[str] = "General Enterprise") -> str:
        return ENTERPRISE_QA_PROMPT.format(
            question=question,
            department=department or "General Enterprise",
            context=context or "No relevant passages found."
        )

