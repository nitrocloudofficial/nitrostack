from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class Scene(BaseModel):
    scene_id: int
    title: str
    duration: int
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    screenshot_path: Optional[str] = None
    recording_path: Optional[str] = None
    transition: Optional[str] = None

class WorkflowStep(BaseModel):
    step_number: int
    action: str
    target_selector: Optional[str] = None
    target_label: Optional[str] = None
    value: Optional[str] = None

class Workflow(BaseModel):
    name: str
    steps: List[WorkflowStep]

class AssetContext(BaseModel):
    screenshots: List[str]
    videos: List[str]
    logos: List[str]
    icons: List[str]
    cursor_path: Optional[List[Dict[str, float]]] = None

class TimelineElement(BaseModel):
    scene: int
    start: float
    end: float
    voice_path: Optional[str] = None
    caption_text: Optional[str] = None
    animation_type: Optional[str] = None

class Timeline(BaseModel):
    elements: List[TimelineElement]
