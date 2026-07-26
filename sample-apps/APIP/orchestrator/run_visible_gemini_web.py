import sys
import os
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "universal-director-agent", "democriticIntelligence")))

from agents.demo.gemini_web_llm import GeminiWebLLM
from agents.universal_director.animation_generator import AnimationGenerator

def main():
    print("==================================================")
    print(" LAUNCHING VISIBLE CHROMIUM BROWSER -> GEMINI WEB ")
    print("==================================================\n")
    
    # Instantiate Web Gemini LLM with headless=False so user sees Chromium browser on screen
    llm = GeminiWebLLM(headless=False)
    
    prompt = """Write a MASSIVE, COMPREHENSIVE, 1000+ LINE STANDALONE SINGLE-FILE HTML (with complete embedded CSS and JS) for a 25-second cinematic 3D product showcase video for "Royal Challengers Bengaluru (RCB) IPL 2026 Season Launch".

CRITICAL VISUAL & MOTION DIRECTIVES:
1. 3D DEVICE SHOWCASE:
   - Render a 3D Metallic Phone Frame container with floating ambient background glow orbs (#EC1C24 & #E3BA48).
   - Render an expanding Dynamic Island pill that expands into "⚡ RCB Match Analytics Active" showing 154.2 Strike Rate and 88% Win Rate.
   - Render a multi-gradient glowing AI orb morphing between Siri and Gemini AI displaying "150/150 PASSED" tactical simulation badge.

2. VISIBLE BROADCAST SUBTITLES OVERLAY:
   - Include a visible bottom broadcast subtitle overlay bar displaying synchronized captions across 4 auto-advancing scenes:
     Scene 1 (0-6s): "Welcome to Royal Challengers Bengaluru 2026 Play Bold Season Launch!"
     Scene 2 (6-12s): "Dynamic Island expands with real-time match analytics and 154 powerplay strike rate."
     Scene 3 (12-18s): "Siri morphs into Gemini AI, delivering 150 passed tactical simulations."
     Scene 4 (18-25s): "Experience the ultimate IPL 2026 Play Bold experience!"

3. MANDATORY INFINITE MOTION:
   - Floating glass cards with CSS 3D perspective transforms (rotateY(10deg), rotateY(-10deg)).
   - Real-time HTML5 particle canvas background in gold and crimson.
   - Auto-advance scenes at 0s, 6s, 12s, 18s using setTimeout().

Return ONLY the complete HTML code starting with <!DOCTYPE html>. Do NOT wrap in markdown backticks or explanations."""

    print("-> Opening visible Chromium browser window on your screen...")
    response = llm.ask_gemini(prompt, timeout=120)
    
    if not response:
        print("[FAIL] Web Gemini did not return a response or user profile needed login.")
        return
        
    print(f"-> Received raw response from Web Gemini ({len(response)} chars)!")
    
    # Extract clean HTML from Web Gemini output
    gen = AnimationGenerator()
    html_code = gen._extract_html(response)
    
    if not html_code or len(html_code) < 300:
        print("[WARN] Extracted HTML snippet was short or empty. Retrying extraction...")
        html_code = response
        
    output_html = os.path.abspath("gemini_live_web_rcb.html")
    with open(output_html, "w", encoding="utf-8") as f:
        f.write(html_code)
        
    print(f"\n==================================================")
    print(f" SUCCESS: GEMINI LIVE WEB CODE GENERATED AT:")
    print(f" {output_html}")
    print(f" File Size: {len(html_code)} bytes")
    print(f"==================================================")

if __name__ == "__main__":
    main()
