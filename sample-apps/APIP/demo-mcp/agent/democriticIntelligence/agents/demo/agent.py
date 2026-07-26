import os
import json

from .workflow_reader import WorkflowReader
from .workflow_selector import WorkflowSelector
from .story_planner import StoryPlanner
from .scene_planner import ScenePlanner
from .asset_manager import AssetManager
from .script_generator import ScriptGenerator
from .tts import VoiceGenerator
from .captions import CaptionGenerator
from .timeline import TimelineBuilder
from .animation import AnimationEngine
from .composer import VideoComposer
from .thumbnail import ThumbnailGenerator
from .validator import Validator
from .publisher import Publisher

class DemoAgent:
    """Main orchestrator for the Demo Video creation pipeline."""
    
    def __init__(self):
        self.reader = WorkflowReader()
        self.selector = WorkflowSelector()
        self.story_planner = StoryPlanner()
        self.scene_planner = ScenePlanner()
        self.asset_manager = AssetManager()
        self.script_generator = ScriptGenerator()
        self.voice_gen = VoiceGenerator()
        self.caption_gen = CaptionGenerator()
        self.timeline_builder = TimelineBuilder()
        self.animation_engine = AnimationEngine()
        self.composer = VideoComposer()
        self.thumbnail_gen = ThumbnailGenerator()
        self.validator = Validator()
        self.publisher = Publisher()

    def run_pipeline(self):
        print("Starting Demo Agent Pipeline...")
        
        # 1. Read workflows
        workflows = self.reader.get_workflows()
        
        # 2. Select workflow
        selected_workflow = self.selector.select(workflows)
        print(f"Selected workflow: {selected_workflow.name}")
        
        # 3. Story Planning
        scenes = self.story_planner.plan(selected_workflow)
        
        # 4. Scene Planning
        planned_scenes = self.scene_planner.plan_scenes(scenes)
        
        # 5. Asset Manager
        assets = self.asset_manager.load_assets()
        
        # 6. Script Generator
        scripts = self.script_generator.generate_script(planned_scenes)
        
        # 7. Voice Generator
        voices = self.voice_gen.generate_voice(scripts)
        
        # 8. Caption Generator
        # (need to derive timings, for now mock them)
        timings = {s.scene_id: s.start_time for s in planned_scenes}
        captions_file = self.caption_gen.generate_captions(scripts, timings)
        
        # 9. Timeline Builder
        timeline = self.timeline_builder.build_timeline(planned_scenes, voices)
        
        # Pre-composition validation
        if not self.validator.validate_pre_composition(timeline, assets, voices):
            print("Validation failed pre-composition. Aborting.")
            return False
            
        # 10. Animation Engine
        self.animation_engine.process(timeline, has_playwright_video=False)
        
        # 11. Video Composer
        video_file = self.composer.compose(timeline, voices, captions_file)
        
        # 12. Thumbnail Generator
        thumbnail_file = self.thumbnail_gen.generate(assets)
        
        # 13. Validator (Post)
        if not self.validator.validate_post_composition(video_file, thumbnail_file):
            print("Validation failed post-composition. Aborting.")
            return False
            
        # 14. Publisher
        # mock writing script and timeline to file for publisher
        with open("script.md", "w") as f:
            f.write("# Generated Script\n")
            for sid, txt in scripts.items():
                f.write(f"**Scene {sid}**: {txt}\n\n")
                
        with open("timeline.json", "w") as f:
            f.write(timeline.model_dump_json(indent=4))
            
        self.publisher.publish(
            video_file=video_file,
            thumbnail_file=thumbnail_file,
            script_file="script.md",
            captions_file=captions_file,
            timeline_file="timeline.json"
        )
        
        print("Demo Agent Pipeline Completed Successfully.")
        return True

if __name__ == "__main__":
    agent = DemoAgent()
    agent.run_pipeline()
