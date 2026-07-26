import sys
import re
from ..demo.gemini_web_llm import GeminiWebLLM

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


class TopicResearcher:
    """Uses Web Gemini to research real-world product features, UI design patterns,
    brand colors, and workflow steps for any given topic before video generation.
    """
    
    def __init__(self):
        self.llm = GeminiWebLLM()
        
    def research(self, topic: str) -> dict:
        """Perform deep topic research using Web Gemini."""
        print(f"[TopicResearcher] Researching real-world product & UI context for '{topic}'...")
        
        prompt = f"""You are a Principal Product Researcher and Brand Strategist.

Search your knowledge base and live web context for "{topic}". Analyze the real-world product, software, or service, and provide a structured design & workflow specification brief:

1. Exact App / Product Name (e.g., "Uber Moto", "SpaceX Starship", "Netflix", "Apple Siri"):
2. Official Slogan / Tagline (6-8 words max):
3. Real Brand Color Palette (Primary Hex, Accent Hex, Dark Mode Background Hex):
4. Recommended UI Form-Factor (e.g., 3D Smartphone Frame, Full-Bleed 3D HUD Telemetry, Cinema TV Viewport, Dark Glass Desktop App):
5. 4 Sequential Real-World User Workflow Steps (Describe exact UI screens and what visuals appear in each scene):
   - Scene 1 (0s-10s): Opening reveal / main entry screen
   - Scene 2 (10s-24s): Core feature / live activity screen
   - Scene 3 (24s-36s): Key metric / achievement screen
   - Scene 4 (36s-45s): Call to action & brand outro
6. 4 Real Key Metrics & UI Badges (with actual units/numbers for {topic}):

Be extremely specific and accurate to "{topic}". Return this specification clearly."""

        research_text = self.llm.ask_gemini(prompt, timeout=90)
        
        if not research_text or len(research_text) < 100:
            print("[TopicResearcher] Research fallback used.")
            research_text = f"Product: {topic.title()}\nTagline: Next-gen {topic} experience\nForm-Factor: Bespoke 3D Interface\nColor: #00F2FE and #FF0844"

        print(f"[TopicResearcher] Research completed ({len(research_text)} chars).")
        return {
            "topic": topic,
            "brief": research_text
        }
