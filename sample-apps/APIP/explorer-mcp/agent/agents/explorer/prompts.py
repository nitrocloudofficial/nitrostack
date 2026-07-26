"""Prompt templates for potential future LLM-guided vision and planning modules."""

VISION_ANALYSIS_PROMPT = """
You are an expert UI/UX analysis model. Examine the provided screenshot of a web application and identify:
1. Unlabeled icons or interactive graphical components.
2. Visual grouping of related controls (e.g. toolbars, card actions, tab groups).
3. Data charts, canvas visualizations, or custom non-standard inputs.
4. Any visually prominent validation messages or status indicators.

Return a structured JSON mapping of visual elements and their estimated functional intent.
"""

WORKFLOW_INFERENCE_PROMPT = """
Given the sequence of user actions and observed DOM changes:
Actions: {action_history}
Observed Pages: {pages_visited}

Identify logical user workflows (e.g., user signup, project creation, settings update) and output step-by-step workflow definitions.
"""
