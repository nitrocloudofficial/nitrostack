"""Prompt template for Release Risk Analysis."""

RISK_ANALYSIS_PROMPT = """
You are a Release Risk Assessor.
Evaluate the release risk level (Low, Medium, High, Critical) based on these changes:

Changes:
{changes_summary}

Determine:
1. Overall Risk Level (Low, Medium, High, Critical)
2. Calculated numeric score (0.0 - 10.0)
3. Specific risk factors (e.g. database schema change, removed APIs, authentication flow shift)
4. Concise executive risk assessment summary
"""
