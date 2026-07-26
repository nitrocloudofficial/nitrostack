"""Prompts package for Release Intelligence Agent."""

from agents.release_intelligence.prompts.release_notes_prompt import (
    RELEASE_NOTES_CUSTOMER_PROMPT,
    RELEASE_NOTES_ENGINEERING_PROMPT,
    RELEASE_NOTES_EXECUTIVE_PROMPT,
    RELEASE_NOTES_TECHNICAL_PROMPT,
)
from agents.release_intelligence.prompts.impact_analysis_prompt import IMPACT_ANALYSIS_SYSTEM_PROMPT
from agents.release_intelligence.prompts.breaking_changes_prompt import BREAKING_CHANGES_PROMPT
from agents.release_intelligence.prompts.customer_summary_prompt import CUSTOMER_SUMMARY_PROMPT
from agents.release_intelligence.prompts.developer_summary_prompt import DEVELOPER_SUMMARY_PROMPT
from agents.release_intelligence.prompts.risk_analysis_prompt import RISK_ANALYSIS_PROMPT

__all__ = [
    "RELEASE_NOTES_CUSTOMER_PROMPT",
    "RELEASE_NOTES_ENGINEERING_PROMPT",
    "RELEASE_NOTES_EXECUTIVE_PROMPT",
    "RELEASE_NOTES_TECHNICAL_PROMPT",
    "IMPACT_ANALYSIS_SYSTEM_PROMPT",
    "BREAKING_CHANGES_PROMPT",
    "CUSTOMER_SUMMARY_PROMPT",
    "DEVELOPER_SUMMARY_PROMPT",
    "RISK_ANALYSIS_PROMPT",
]
