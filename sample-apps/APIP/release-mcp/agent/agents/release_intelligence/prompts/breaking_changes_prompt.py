"""Prompt template for identifying Breaking Changes."""

BREAKING_CHANGES_PROMPT = """
Analyze the following change set and identify all BREAKING CHANGES:

Changes:
{changes_summary}

For each breaking change, specify:
1. Component / API Endpoint name
2. Description of why it breaks existing behavior or contracts
3. Mitigation advice for users or API consumers
"""
