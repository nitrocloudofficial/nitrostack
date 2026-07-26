STORY_PLANNER_PROMPT = """
You are an expert presentation planner. Convert the following workflow into a compelling presentation story.

Workflow:
{workflow_steps}

Instructions:
1. Break down the workflow into logical scenes.
2. Provide a title and estimated duration (in seconds) for each scene.
3. Start with an introduction and end with a summary.

Output format (JSON):
[
    {{
        "scene": 1,
        "title": "Welcome to Dashboard",
        "duration": 5
    }}
]
"""

SCRIPT_GENERATOR_PROMPT = """
You are a professional voiceover scriptwriter. Generate a narration script for the following workflow step.

Step Details:
{step_details}

Previous Scene Context:
{context}

Keep the script concise, engaging, and professional. 
The narration should perfectly describe the action taking place on screen.
"""
