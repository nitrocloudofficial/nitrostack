from .models import Timeline, TimelineElement, Scene
from typing import List

class TimelineBuilder:
    """Synchronizes scenes, voice, captions, and visual elements."""
    
    def build_timeline(self, scenes: List[Scene], voice_paths: dict[int, str]) -> Timeline:
        elements = []
        
        for scene in scenes:
            elements.append(TimelineElement(
                scene=scene.scene_id,
                start=scene.start_time,
                end=scene.end_time,
                voice_path=voice_paths.get(scene.scene_id),
                animation_type=scene.transition
            ))
            
        return Timeline(elements=elements)
