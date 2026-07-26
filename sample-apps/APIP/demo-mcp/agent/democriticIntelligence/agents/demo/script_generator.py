from .models import Scene, WorkflowStep
from .prompts import SCRIPT_GENERATOR_PROMPT
from .gemini_web_llm import GeminiWebLLM
from typing import List

class ScriptGenerator:
    """Generates narration scripts using Web Gemini."""
    
    def __init__(self):
        self.llm = GeminiWebLLM()
        
    def generate_script(self, scenes: List[Scene]) -> dict[int, str]:
        print("[ScriptGenerator] Asking Gemini Web to generate dynamic narration script matching 45s duration...")
        
        scene_descriptions = "\n".join([f"Scene {s.scene_id}: {s.title} (duration: {s.duration}s)" for s in scenes])
        prompt = (
            f"{SCRIPT_GENERATOR_PROMPT}\n\n"
            "CRITICAL TIMING INSTRUCTION: The total video animation runtime is exactly 45 seconds.\n"
            "Please write a comprehensive, rich, professional narration script of approximately 130 to 140 words in total.\n"
            "Ensure the narration flows smoothly from Scene 1 to Scene 4 without ending early.\n"
            f"Scenes to cover:\n{scene_descriptions}\n"
            "Return JSON format mapping scene_id to string text, e.g.:\n"
            '{\n  "1": "Welcome to Uber. Today we book a fast ride...",\n  "2": "Next, review your ride options...",\n  "3": "Watch your driver navigate in real-time...",\n  "4": "Uber Moto—your reliable ride for navigating the city."\n}'
        )
        
        ai_data = self.llm.generate_json(prompt)
        
        if isinstance(ai_data, dict) and len(ai_data) > 0:
            print("[ScriptGenerator] Successfully generated narration script via Gemini Web!")
            scripts = {}
            for s in scenes:
                key = str(s.scene_id)
                if key in ai_data:
                    scripts[s.scene_id] = ai_data[key]
                elif s.scene_id in ai_data:
                    scripts[s.scene_id] = ai_data[s.scene_id]
                else:
                    scripts[s.scene_id] = f"Now presenting {s.title}."
            return scripts
            
        print("[ScriptGenerator] Using pre-configured fallback script generator...")
        scripts = {}
        for scene in scenes:
            if "Introduction" in scene.title or scene.scene_id == 1:
                scripts[scene.scene_id] = "Welcome to Uber. Today, we're going to book a fast, affordable ride using Uber Moto. First, just tap the search bar and enter your destination, like Koramangala, Bangalore."
            elif scene.scene_id == 2:
                scripts[scene.scene_id] = "Next, review your ride options. Select Uber Moto from the list to beat the traffic, and confirm your request. In seconds, a nearby rider is assigned."
            elif scene.scene_id == 3:
                scripts[scene.scene_id] = "Now, watch as your driver navigates right to your location in real-time. You can track their exact progress on the map, along with your updated ETA and distance, ensuring you know exactly when to step outside."
            elif scene.scene_id == 4:
                scripts[scene.scene_id] = "Once you arrive safely, rate your trip. Uber Moto—your fast, reliable, and trusted ride for navigating the city. Over five hundred million rides completed worldwide. Book your next journey today."
            else:
                scripts[scene.scene_id] = ""
                
        return scripts
