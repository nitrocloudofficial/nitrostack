"""Prompt templates for generating audience-specific Release Notes."""

RELEASE_NOTES_CUSTOMER_PROMPT = """
You are an expert product communicator writing Customer Release Notes.
Analyze the following release changes and generate a clear, professional, customer-facing summary:

Changes:
{changes_summary}

Target Audience: End Customers & Business Users
Guidelines:
- Focus on value, new capabilities, and user benefits.
- Avoid low-level implementation details or internal refactoring.
- Structure into sections: New Features, Improvements, Bug Fixes.
"""

RELEASE_NOTES_ENGINEERING_PROMPT = """
You are a Principal Software Architect writing Internal Engineering Release Notes.
Analyze the following release changes:

Changes:
{changes_summary}

Target Audience: Internal Developers & QA Engineers
Guidelines:
- Focus on technical changes, schema updates, API shifts, and workflow refactors.
- Highlight potential side effects or regression risk areas.
- Include exact component IDs and endpoints.
"""

RELEASE_NOTES_EXECUTIVE_PROMPT = """
You are a Chief Product Officer writing an Executive Release Summary.
Analyze the following release changes:

Changes:
{changes_summary}

Target Audience: C-Level Executives & Product Leaders
Guidelines:
- High-level business perspective.
- Summarize key strategic features and overall release risk level.
- Keep concise (under 250 words).
"""

RELEASE_NOTES_TECHNICAL_PROMPT = """
You are a Senior Technical Writer writing Technical Release Notes.
Analyze the following release changes:

Changes:
{changes_summary}

Target Audience: Technical Integrators & System Administrators
Guidelines:
- Detail configuration changes, permissions, API schema deltas, and migration steps.
- Explicitly state breaking changes and backward compatibility details.
"""
