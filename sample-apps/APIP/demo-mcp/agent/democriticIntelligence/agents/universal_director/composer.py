import os
import subprocess
from playwright.sync_api import sync_playwright


class UniversalComposer:
    """Renders the dynamically generated animation and combines AI voiceover with synced subtitles.
    
    Unlike the hardcoded FitnessComposer, this takes the HTML path as input
    so it can record ANY dynamically generated animation.
    """
    
    def compose(
        self,
        html_path: str,
        topic: str,
        audio_track: str,
        captions_file: str,
        duration_sec: float = 30.0,
        headless: bool = False
    ) -> str:
        """Record the dynamic animation and merge with audio + subtitles."""
        
        safe_topic = topic.lower().replace(" ", "-").replace("_", "-")
        raw_output = f"{safe_topic}_raw.webm"
        final_output = f"{safe_topic}_demo_final.mp4"
        
        recording_ms = int((duration_sec + 1.5) * 1000)
        print(f"[UniversalComposer] Opening Chromium to record {safe_topic} UI animation ({duration_sec:.1f}s audio)...")
        
        file_url = f"file:///{os.path.abspath(html_path).replace(chr(92), '/')}"
        
        rec_dir = os.path.abspath(f"temp_rec_{safe_topic}")
        os.makedirs(rec_dir, exist_ok=True)
        
        video_path = None
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=headless)
            context = browser.new_context(
                record_video_dir=rec_dir,
                record_video_size={"width": 1920, "height": 1080},
                viewport={"width": 1920, "height": 1080},
                device_scale_factor=2
            )
            page = context.new_page()
            
            print(f"[UniversalComposer] Opening {file_url}")
            page.goto(file_url)
            
            print(f"[UniversalComposer] Recording {duration_sec:.1f}s {safe_topic} animation... Please wait.")
            page.wait_for_timeout(recording_ms)
            
            # Obtain exact video path before context close
            try:
                video_path = page.video.path()
            except Exception:
                pass
                
            context.close()
            browser.close()
        
        import time
        import shutil
        time.sleep(1.0)
        
        # Locate recorded video file
        if not video_path or not os.path.exists(video_path):
            if os.path.exists(rec_dir):
                for f in os.listdir(rec_dir):
                    if f.endswith(".webm"):
                        video_path = os.path.join(rec_dir, f)
                        break
        
        if os.path.exists(raw_output):
            try:
                os.remove(raw_output)
            except Exception:
                pass
                
        if video_path and os.path.exists(video_path):
            for attempt in range(5):
                try:
                    shutil.move(video_path, raw_output)
                    break
                except OSError:
                    time.sleep(1)
        
        # Clean up temp recording directory
        if os.path.exists(rec_dir):
            try:
                shutil.rmtree(rec_dir, ignore_errors=True)
            except Exception:
                pass
        
        # Merge Video + Audio + Burn Subtitles with Broadcast Styling
        print(f"[UniversalComposer] Merging audio {audio_track} and burning subtitles {captions_file}...")
        if os.path.exists(final_output):
            os.remove(final_output)
            
        # Format force_style for high-legibility subtitle box
        sub_filter = f"subtitles='{captions_file}':force_style='FontName=Segoe UI,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H99000000,BorderStyle=4,MarginV=45,Alignment=2'"
            
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
            "-vf", sub_filter,
            "-shortest",
            final_output
        ]
        
        try:
            subprocess.run(ffmpeg_cmd, check=True)
            print(f"[UniversalComposer] {safe_topic} video composition completed successfully!")
        except Exception as e:
            print(f"[UniversalComposer] FFmpeg failed: {e}")
            return raw_output
            
        return final_output
