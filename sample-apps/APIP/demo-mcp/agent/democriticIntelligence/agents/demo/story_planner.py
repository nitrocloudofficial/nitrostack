import json
from .models import Workflow, Scene
from .prompts import STORY_PLANNER_PROMPT
from .gemini_web_llm import GeminiWebLLM
from typing import List

class StoryPlanner:
    """Converts workflow into a presentation story outline using Web Gemini."""
    
    def __init__(self):
        self.llm = GeminiWebLLM()
    
    def plan(self, workflow: Workflow) -> List[Scene]:
        steps_summary = "\n".join([f"Step {s.step_number}: {s.action} on {s.target_label}" for s in workflow.steps])
        prompt = STORY_PLANNER_PROMPT.format(workflow_steps=steps_summary)
        
        print("[StoryPlanner] Asking Gemini Web to dynamically plan scenes...")
        ai_data = self.llm.generate_json(prompt)
        
        scenes = []
        if isinstance(ai_data, list) and len(ai_data) > 0:
            print(f"[StoryPlanner] Successfully generated {len(ai_data)} dynamic scenes using Gemini Web!")
            for idx, item in enumerate(ai_data):
                scenes.append(Scene(
                    scene_id=item.get("scene", idx + 1),
                    title=item.get("title", f"Scene {idx + 1}"),
                    duration=item.get("duration", 5),
                    transition="cross_dissolve" if idx > 0 and idx < len(ai_data) - 1 else "fade"
                ))
            return scenes
            
        print("[StoryPlanner] Using pre-configured fallback scene planner...")
        # Fallback Plan
        scenes.append(Scene(
            scene_id=1,
            title="Introduction to " + workflow.name,
            duration=5,
            transition="fade"
        ))
        
        for i, step in enumerate(workflow.steps):
            scenes.append(Scene(
                scene_id=i + 2,
                title=f"Step {step.step_number}: {step.action} {step.target_label or ''}",
                duration=4,
                transition="cross_dissolve"
            ))
            
        scenes.append(Scene(
            scene_id=len(workflow.steps) + 2,
            title="Summary & Review",
            duration=5,
            transition="fade"
        ))
        
        return scenes
