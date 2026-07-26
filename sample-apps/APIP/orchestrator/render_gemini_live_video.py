import asyncio
import os
import subprocess
import time
import shutil

async def generate_narration():
    script_text = (
        "Welcome to the Web Gemini Live Generated 3D Showcase. "
        "Scene one: Lock Screen notification highlights Play Bold strategy at M. Chinnaswamy Stadium. "
        "Scene two: Dynamic Island expands with real-time match analytics and 154 strike rate. "
        "Scene three: Siri morphs into Gemini AI, delivering 150 passed tactical simulations. "
        "Scene four: Experience the ultimate IPL 2026 Play Bold experience!"
    )
    
    audio_file = "gemini_live_narration.mp3"
    print("-> Generating narration with Edge-TTS...")
    import edge_tts
    communicate = edge_tts.Communicate(script_text, "en-US-GuyNeural")
    await communicate.save(audio_file)
    print(f"-> Audio generated: {audio_file}")
    return audio_file

def render_motion_frames_and_compile(html_file: str, audio_file: str):
    frames_dir = os.path.abspath("gemini_live_frames")
    if os.path.exists(frames_dir):
        shutil.rmtree(frames_dir)
    os.makedirs(frames_dir)

    print("-> Capturing Web Gemini live animation frames with Playwright (25 Seconds Total)...")
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto(f"file:///{html_file.replace('\\', '/')}")
        page.wait_for_timeout(500)

        total_duration_sec = 25.0
        fps = 10
        total_frames = int(total_duration_sec * fps)

        for i in range(total_frames):
            current_sec = i / fps
            
            if current_sec < 6.0:
                scene_num = 1
            elif current_sec < 12.0:
                scene_num = 2
            elif current_sec < 18.0:
                scene_num = 3
            else:
                scene_num = 4

            page.evaluate(f"window.setScene({scene_num})")
            
            frame_path = os.path.join(frames_dir, f"frame_{i:04d}.png")
            page.screenshot(path=frame_path)
            if i % 25 == 0:
                print(f"   [Frame Capture] {i}/{total_frames} frames rendered (Scene {scene_num})...")
            time.sleep(1 / fps)

        browser.close()

    print("-> Compiling Web Gemini MP4 video with audio & broadcast subtitles...")
    output_video = os.path.abspath("gemini_live_web_showcase.mp4")
    
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-framerate", str(fps),
        "-i", os.path.join(frames_dir, "frame_%04d.png"),
        "-i", audio_file,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        output_video
    ]
    
    subprocess.run(ffmpeg_cmd, check=True)
    print(f"\n==================================================")
    print(f" SUCCESS: GEMINI LIVE WEB MP4 VIDEO CREATED AT:")
    print(f" {output_video}")
    print(f"==================================================")
    return output_video

if __name__ == "__main__":
    audio = asyncio.run(generate_narration())
    html = os.path.abspath("gemini_live_web_rcb.html")
    render_motion_frames_and_compile(html, audio)
