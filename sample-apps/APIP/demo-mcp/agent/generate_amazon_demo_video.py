"""
Amazon 3D Demo Video Generator
Uses Playwright to render the 3D WebGL Amazon Prime Air & AWS Keynote animation (amazon.html)
and record a high-definition video artifact.
"""

import sys
import os
import asyncio
import time
from playwright.async_api import async_playwright

async def generate_video():
    html_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "democriticIntelligence", "animation", "amazon.html"))
    artifact_dir = r"C:\Users\Guru\.gemini\antigravity-ide\brain\1813d45c-c547-4fa0-afd2-d04575f29438"
    os.makedirs(artifact_dir, exist_ok=True)
    video_dir = os.path.join(artifact_dir, "video_temp")
    os.makedirs(video_dir, exist_ok=True)

    print(f"[DEMO AGENT] Loading 3D Animation Template: {html_path}")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=video_dir,
            record_video_size={"width": 1920, "height": 1080}
        )
        page = await context.new_page()
        file_url = f"file:///{html_path.replace(os.sep, '/')}"
        
        await page.goto(file_url)
        print("[DEMO AGENT] Recording 3D WebGL Amazon Prime Air & AWS Keynote Showcase...")
        
        # Wait 10 seconds to capture the full 3D animation reel
        await asyncio.sleep(10)
        
        await page.close()
        await context.close()
        await browser.close()
        
        # Locate recorded video file
        recorded_files = [os.path.join(video_dir, f) for f in os.listdir(video_dir) if f.endswith(".webm")]
        if recorded_files:
            final_video_path = os.path.join(artifact_dir, "amazon_demo_showcase.webm")
            if os.path.exists(final_video_path):
                os.remove(final_video_path)
            os.rename(recorded_files[0], final_video_path)
            os.rmdir(video_dir)
            print(f"[DEMO AGENT SUCCESS] Recorded Demo Video saved at: {final_video_path}")
            return final_video_path
        else:
            print("[DEMO AGENT ERROR] Video recording failed.")
            return None

if __name__ == "__main__":
    asyncio.run(generate_video())
