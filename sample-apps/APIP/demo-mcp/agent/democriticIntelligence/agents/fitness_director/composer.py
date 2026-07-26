import os
import subprocess
from playwright.sync_api import sync_playwright

class FitnessComposer:
    """Renders the Fitness product animation and combines AI voiceover with synced subtitles."""
    
    def compose(self, audio_track: str = "fitness_voiceover.mp3", captions_file: str = "fitness_captions.vtt") -> str:
        raw_output = "fitness_raw.webm"
        final_output = "fitness_demo_final.mp4"
        
        print(f"[FitnessComposer] Recording Fitness UI animation to {raw_output}...")
        
        html_path = os.path.abspath(os.path.join("animation", "fitness.html"))
        file_url = f"file:///{html_path.replace(chr(92), '/')}"
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                record_video_dir=".",
                record_video_size={"width": 1920, "height": 1080},
                viewport={"width": 1920, "height": 1080},
                device_scale_factor=2
            )
            page = context.new_page()
            
            print(f"[FitnessComposer] Opening {file_url}")
            page.goto(file_url)
            
            print("[FitnessComposer] Recording 45-second Fitness UI animation... Please wait.")
            page.wait_for_timeout(46000)
            
            context.close()
            browser.close()
            
            for file_name in os.listdir("."):
                if file_name.endswith(".webm") and file_name != raw_output:
                    if os.path.exists(raw_output):
                        os.remove(raw_output)
                    os.rename(file_name, raw_output)
                    break
        
        print(f"[FitnessComposer] Merging audio {audio_track} and burning subtitles {captions_file}...")
        if os.path.exists(final_output):
            os.remove(final_output)
            
        ffmpeg_cmd = [
            "ffmpeg", 
            "-y", 
            "-i", raw_output,
            "-i", audio_track,
            "-c:v", "libx264", 
            "-preset", "slow", 
            "-crf", "18",
            "-c:a", "aac", 
            "-b:a", "192k",
            "-vf", f"subtitles={captions_file}",
            "-shortest",
            final_output
        ]
        
        try:
            subprocess.run(ffmpeg_cmd, check=True)
            print("[FitnessComposer] Fitness Demo video composition completed successfully!")
        except Exception as e:
            print(f"[FitnessComposer] FFmpeg failed: {e}")
            return raw_output
            
        return final_output
