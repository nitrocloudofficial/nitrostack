import os
import subprocess
from playwright.sync_api import sync_playwright

class VideoComposer:
    """Produces the final video by combining all elements."""
    
    def compose(self, timeline, audio_tracks: dict[int, str], captions_file: str) -> str:
        raw_output = "demo_raw.webm"
        final_output = "demo_final.mp4"
        voice_track = audio_tracks.get(1, "voiceover.mp3") # Using the unified voiceover
        
        print(f"Recording raw video to {raw_output}...")
        
        html_path = os.path.abspath(os.path.join("animation", "uber.html"))
        file_url = f"file:///{html_path.replace(chr(92), '/')}"
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                record_video_dir=".",
                record_video_size={"width": 1920, "height": 1080},
                viewport={"width": 1920, "height": 1080},
                device_scale_factor=2 # Retina quality recording
            )
            page = context.new_page()
            
            print(f"Opening {file_url}")
            page.goto(file_url)
            
            # Hide Playback controls so they aren't recorded in the video
            page.add_style_tag(content=".control-panel { display: none !important; }")
            
            # Wait for the full 45-second animation to finish + 1 second padding
            print("Recording 45-second animation... Please wait.")
            page.wait_for_timeout(46000)
            
            context.close()
            browser.close()
            
            for file_name in os.listdir("."):
                if file_name.endswith(".webm") and file_name != raw_output:
                    if os.path.exists(raw_output):
                        os.remove(raw_output)
                    os.rename(file_name, raw_output)
                    break
        
        # Merge Video, Audio, and Burn Subtitles using high-quality FFmpeg flags
        print(f"Merging AI voiceover {voice_track} and burning subtitles {captions_file}...")
        if os.path.exists(final_output):
            os.remove(final_output)
            
        ffmpeg_cmd = [
            "ffmpeg", 
            "-y", 
            "-i", raw_output,
            "-i", voice_track,
            "-c:v", "libx264", 
            "-preset", "slow", 
            "-crf", "18", # High quality video
            "-c:a", "aac", 
            "-b:a", "192k",
            "-vf", f"subtitles={captions_file}",
            "-shortest", # End when the shortest stream (video) ends
            final_output
        ]
        
        try:
            subprocess.run(ffmpeg_cmd, check=True)
            print("Video composition completed successfully!")
        except Exception as e:
            print(f"FFmpeg failed: {e}")
            return raw_output
            
        return final_output
