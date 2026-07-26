from .models import Scene
from typing import List

class ScenePlanner:
    """Refines the story outline into concrete scenes with timings."""
    
    def plan_scenes(self, scenes: List[Scene]) -> List[Scene]:
        current_time = 0.0
        
        for scene in scenes:
            scene.start_time = current_time
            scene.end_time = current_time + scene.duration
            current_time = scene.end_time
            
            # Simulated assignment of screenshots based on title context
            scene.screenshot_path = f"assets/screenshots/scene_{scene.scene_id}.png"
            
        return scenes
