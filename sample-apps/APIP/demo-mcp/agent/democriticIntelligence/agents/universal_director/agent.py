import os
import sys
import subprocess
from .topic_researcher import TopicResearcher
from .animation_generator import AnimationGenerator
from .script_writer import ScriptWriter
from .composer import UniversalComposer
from .thumbnail_generator import ThumbnailGenerator
from .image_asset_generator import ImageAssetGenerator

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


class UniversalDirectorAgent:
    """Universal Director Agent -- FULLY LLM-driven video pipeline with Web Research.
    
    Give it ANY topic and it produces an authentic, research-backed product demo video.
    EVERYTHING is driven by Web Gemini:
    
    0. Asks Gemini to RESEARCH real-world product specs, workflows, colors & terminology
    1. Asks Gemini to WRITE matching voiceover narration
    2. Generates audio + subtitles via Edge-TTS
    3. Asks Gemini to WRITE bespoke HTML/CSS/JS animation code matching the research
    4. Asks Gemini to GENERATE high-resolution AI Product Images for all animation assets
    5. Records animation + composes 1080p MP4
    6. Asks Gemini to GENERATE a 16:9 product hero thumbnail
    """
    
    def __init__(self):
        self.researcher = TopicResearcher()
        self.animation_gen = AnimationGenerator()
        self.script_writer = ScriptWriter()
        self.composer = UniversalComposer()
        self.thumbnail_gen = ThumbnailGenerator()
        self.image_asset_gen = ImageAssetGenerator()

    def _get_audio_duration(self, audio_file: str) -> float:
        """Get exact duration of MP3 audio file using ffprobe or fallback estimation."""
        try:
            cmd = [
                "ffprobe", "-v", "error", "-show_entries",
                "format=duration", "-of", "default=noprint_wrappers=1:nokey=1",
                audio_file
            ]
            out = subprocess.check_output(cmd).decode('utf-8').strip()
            return float(out)
        except Exception:
            if os.path.exists(audio_file):
                size = os.path.getsize(audio_file)
                return max(15.0, round(size / 16000.0, 1))
            return 30.0

    def run(self, topic: str) -> str:
        """Run the complete video pipeline for any topic with perfect audio-visual sync."""
        
        safe_topic = topic.lower().replace(" ", "-").replace("_", "-")
        
        print("=" * 60)
        print(f"  Universal Director: Creating Video for '{topic}'")
        print(f"  Dynamic Audio-Visual Sync Pipeline")
        print("=" * 60)
        
        # -- Step 0: Research Real-World Product & UI Specs --
        print(f"\n{'-'*50}")
        print(f"[Step 0/5] GEMINI -> Researching real-world context for '{topic}'")
        print(f"{'-'*50}")
        
        research_res = self.researcher.research(topic)
        research_brief = research_res.get("brief", "")
        
        # -- Step 1: Generate Voiceover Narration & Audio FIRST --
        print(f"\n{'-'*50}")
        print(f"[Step 1/5] GEMINI -> Generate voiceover narration script")
        print(f"{'-'*50}")
        
        # Extract temporary app name candidate
        app_name_match = topic.title()
        
        script_text = self.script_writer.write(
            topic=topic,
            app_name=app_name_match,
            research_brief=research_brief
        )
        
        audio_file = f"{safe_topic}_voiceover.mp3"
        captions_file = f"{safe_topic}_captions.vtt"
        
        print(f"  [OK] Narration: {len(script_text.split())} words")
        print(f"  [OK] Edge-TTS -> Generating audio track & subtitles...")
        
        try:
            subprocess.run([
                "python", "-m", "edge_tts",
                "--text", script_text,
                "--write-media", audio_file,
                "--write-subtitles", captions_file
            ], check=True)
            print(f"  [OK] Audio: {audio_file}")
            print(f"  [OK] Subtitles: {captions_file}")
        except Exception as e:
            print(f"  [FAIL] Edge-TTS error: {e}")

        # Compute exact audio duration
        audio_duration = self._get_audio_duration(audio_file)
        print(f"  [OK] Measured Narration Duration: {audio_duration:.1f} seconds")
        
        # -- Step 2: Generate Bespoke Animation Code Synced to Audio Duration --
        print(f"\n{'-'*50}")
        print(f"[Step 2/5] GEMINI -> Generate animation code (Target: {audio_duration:.1f}s)")
        print(f"  Opening Chromium -> gemini.google.com...")
        print(f"{'-'*50}")
        
        result = self.animation_gen.generate(
            topic=topic, 
            research_brief=research_brief,
            audio_duration=audio_duration
        )
        html_path = result["html_path"]
        app_name = result["app_name"]
        app_tagline = result["app_tagline"]
        
        print(f"\n  [OK] App Name: {app_name}")
        print(f"  [OK] Tagline: {app_tagline}")
        print(f"  [OK] Animation: {html_path}")

        # -- Step 2.5: Generate High-Resolution AI Product Images for Animation Assets --
        print(f"\n{'-'*50}")
        print(f"[Step 2.5/5] GEMINI -> Generate AI Product Visual Assets for Animation")
        print(f"{'-'*50}")
        
        try:
            self.image_asset_gen.generate_assets_for_html(
                html_path=html_path,
                topic=topic,
                research_brief=research_brief
            )
        except Exception as img_err:
            print(f"  [WARN] Image asset generation warning: {img_err}")

        # -- Step 3: Record animation + compose final video matching exact audio duration --
        print(f"\n{'-'*50}")
        print(f"[Step 3/5] Composer -> Record animation + merge audio ({audio_duration:.1f}s)")
        print(f"{'-'*50}")
        
        video_output = self.composer.compose(
            html_path=html_path,
            topic=topic,
            audio_track=audio_file,
            captions_file=captions_file,
            duration_sec=audio_duration
        )
        
        # -- Step 4: Generate thumbnail via Gemini image generation --
        print(f"\n{'-'*50}")
        print(f"[Step 4/5] GEMINI -> Generate thumbnail image")
        print(f"  Opening Chromium -> gemini.google.com...")
        print(f"{'-'*50}")
        
        thumbnail_path = self.thumbnail_gen.generate(
            topic=topic,
            app_name=app_name
        )
        
        if thumbnail_path:
            print(f"  [OK] Thumbnail: {thumbnail_path}")
        else:
            print(f"  [SKIP] Thumbnail generation skipped")
        
        print(f"\n{'='*60}")
        print(f"  VIDEO CREATED SUCCESSFULLY!")
        print(f"  ")
        print(f"  Topic:            {topic}")
        print(f"  App:              {app_name}")
        print(f"  Tagline:          {app_tagline}")
        print(f"  Audio Duration:   {audio_duration:.1f}s")
        print(f"  Video:            {video_output}")
        print(f"  Thumbnail:        {thumbnail_path or 'N/A'}")
        print(f"{'='*60}")
        
        return video_output


if __name__ == "__main__":
    topic = sys.argv[1] if len(sys.argv) > 1 else "fitness"
    
    agent = UniversalDirectorAgent()
    agent.run(topic)
