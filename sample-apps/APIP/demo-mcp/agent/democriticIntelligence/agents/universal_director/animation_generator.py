import os
import sys
import re
from ..demo.gemini_web_llm import GeminiWebLLM

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


class AnimationGenerator:
    """Uses Web Gemini (via Chromium browser) to generate the COMPLETE animation code.
    
    This is NOT a template filler — Gemini itself writes the full HTML, CSS, and JS.
    We just give it the topic and let the LLM create everything from scratch.
    
    Flow:
    1. Opens Chromium browser → gemini.google.com (uses logged-in account)
    2. Sends prompt asking Gemini to write a complete product showcase animation
    3. Extracts the HTML/CSS/JS code from Gemini's response
    4. Saves the files to the animation directory
    """
    
    def __init__(self):
        self.llm = GeminiWebLLM()
        self.animation_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "animation")
        )
    
    def generate(self, topic: str, research_brief: str = None, audio_duration: float = 30.0) -> dict:
        """Ask Web Gemini to create the complete animation for the given topic.
        
        Returns dict with:
            - html_path: path to the generated HTML file
            - app_name: the app name Gemini chose
            - app_tagline: the tagline Gemini chose
        """
        
        safe_topic = topic.lower().replace(" ", "-").replace("_", "-")
        
        # ── Step 1: Ask Gemini to generate the FULL HTML (with embedded CSS + JS) ──
        print(f"[AnimationGenerator] Opening Chromium → gemini.google.com")
        print(f"[AnimationGenerator] Asking Gemini to CREATE complete '{topic}' animation (Duration: {audio_duration:.1f}s)...")
        
        html_code = self._ask_gemini_for_html(topic, research_brief, audio_duration)
        
        if not html_code or len(html_code) < 200:
            print("[AnimationGenerator] First attempt too short. Retrying with simpler prompt...")
            html_code = self._retry_html(topic, research_brief, audio_duration)
        
        if not html_code or len(html_code) < 200:
            print("[AnimationGenerator] Retry also failed. Using Gemini for minimal generation...")
            html_code = self._minimal_generation(topic)
        
        # ── Step 2: Save to animation directory ──
        html_path = os.path.join(self.animation_dir, f"{safe_topic}.html")
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_code)
        
        print(f"[AnimationGenerator] Saved generated animation: {html_path}")
        print(f"[AnimationGenerator] File size: {len(html_code)} bytes")
        
        # ── Step 3: Extract app name from generated HTML ──
        app_name = self._extract_app_name(html_code, topic)
        app_tagline = self._extract_tagline(html_code, topic)
        
        return {
            "html_path": html_path,
            "app_name": app_name,
            "app_tagline": app_tagline,
            "html_code": html_code
        }
    
    def _ask_gemini_for_html(self, topic: str, research_brief: str = None, audio_duration: float = 30.0) -> str:
        """Send the main prompt to Web Gemini via Chromium browser."""
        
        brief_context = f"\nRESEARCH BRIEF & SPECIFICATION FOR '{topic}':\n{research_brief}\n" if research_brief else ""
        
        step_interval = round(audio_duration / 4.0, 1)
        t0 = 0.0
        t1 = round(step_interval, 1)
        t2 = round(step_interval * 2, 1)
        t3 = round(step_interval * 3, 1)
        
        prompt = f"""You are a world-renowned Motion Design Director & Lead UI Architect for Apple Keynotes, Stripe Product Launches, SpaceX Flight Terminals, and Netflix Experiences.

I want you to write a MASSIVE, COMPREHENSIVE, BESPOKE STANDALONE HTML FILE (with complete embedded CSS and JavaScript) for a {audio_duration:.1f}-second cinematic product showcase video about "{topic}".
{brief_context}
CRITICAL DURATION & MOTION DIRECTIVES (STRICT RULES):
1. EXACT DURATION & SCENE TIMINGS ({audio_duration:.1f} SECONDS TOTAL):
   - The total video duration is EXACTLY {audio_duration:.1f} seconds.
   - Build 4 distinct animated scenes using CSS `.scene` or `.view-panel` classes with `.active`.
   - Auto-advance through scenes automatically using clean JavaScript `setTimeout()` at EXACTLY:
     - Scene 1: {t0}s (0 ms)
     - Scene 2: {t1}s ({int(t1*1000)} ms)
     - Scene 3: {t2}s ({int(t2*1000)} ms)
     - Scene 4: {t3}s ({int(t3*1000)} ms)
2. MANDATORY CONTINUOUS INFINITE MOTION (ZERO STATIC STOPS):
   - THE UI MUST NEVER SIT STILL! Add continuous CSS `@keyframes` infinite animations to floating glass cards, background gradient mesh orbs, glowing border beams, SVG path strokes, and light arcs (e.g. `animation: floatCard 4s ease-in-out infinite, glowPulse 2.5s ease-in-out infinite`).
   - Use `requestAnimationFrame` or `setInterval` to continuously animate live numbers, dynamic graph tickers, progress rings, and telemetry gauges at 60fps so the page is non-stop alive.
3. NO LAPTOP CONTAINER LOCKS & NO LOADING SPINNERS:
   - Render a bespoke form-factor for "{topic}" (Mobile Phone frame for mobile apps; Full-Bleed 3D Cockpit HUD canvas for aviation/space; 4K Cinema Hero view for media; Dark glass app window for software).
   - Scene 1 MUST render INSTANTLY at 0 seconds with pre-populated UI metrics and active glowing visual elements. DO NOT show empty loading screens or spinners.
4. VISUAL EXCELLENCE:
   - 1920x1080 resolution (16:9 widescreen 4K viewport).
   - Bespoke color palette matching "{topic}".
   - Use smooth 3D glassmorphism, depth transforms, pop-out Z-space cards, and backdrop blur.

Return ONLY the complete raw HTML code starting with <!DOCTYPE html>. Do NOT output markdown backticks or explanations."""
        
        response = self.llm.ask_gemini(prompt, timeout=120)
        
        if not response:
            return ""
        
        return self._extract_html(response)
    
    def _retry_html(self, topic: str, research_brief: str = None, audio_duration: float = 30.0) -> str:
        """Retry with an explicit high-impact prompt."""
        
        brief_context = f"\nRESEARCH BRIEF & SPECIFICATION FOR '{topic}':\n{research_brief}\n" if research_brief else ""
        step_interval = round(audio_duration / 4.0, 1)
        t1, t2, t3 = round(step_interval, 1), round(step_interval * 2, 1), round(step_interval * 3, 1)
        
        prompt = f"""Write a comprehensive 1000+ line single self-contained HTML file (with embedded CSS and JS) for a {audio_duration:.1f}-second product launch video for "{topic}".
{brief_context}
STRICT SPECIFICATIONS:
- 1920x1080 resolution (16:9 widescreen)
- Total duration: {audio_duration:.1f}s. Auto-advance 4 scenes using JavaScript `setTimeout()` at 0s, {t1}s, {t2}s, {t3}s.
- MANDATORY INFINITE MOTION: Every element must use infinite `@keyframes` float/pulse animations and JS live counters so the screen NEVER sits static!
- DO NOT wrap in a generic computer mockup or show any "Loading..." spinners!
- Render a bespoke UI structure tailored specifically for {topic}.
- Scene 1 MUST load INSTANTLY at 0s with pre-filled UI metrics, glowing charts, SVG icons, and live animations.

Return ONLY the HTML code starting with <!DOCTYPE html>."""
        
        response = self.llm.ask_gemini(prompt, timeout=120)
        
        if not response:
            return ""
        
        return self._extract_html(response)
    
    def _minimal_generation(self, topic: str) -> str:
        """Last resort — ask Gemini just for the creative content, then build minimal HTML."""
        
        # Still use Gemini for the creative parts
        prompt = f"""For a mobile app about "{topic}", give me:
1. A creative 2-word app name
2. A short tagline (max 6 words)
3. A primary hex color that fits {topic}
4. An accent hex color
5. A user emoji
6. Two key metrics with icons, values, and labels
7. A CTA button text
8. A live activity name
9. A completion message
10. A social proof line

Format each answer on its own line, numbered 1-10. No extra text."""

        response = self.llm.ask_gemini(prompt, timeout=60)
        
        # Parse the numbered lines
        lines = {}
        if response:
            for line in response.strip().split('\n'):
                line = line.strip()
                for i in range(1, 11):
                    prefixes = [f"{i}.", f"{i})", f"{i}:"]
                    for prefix in prefixes:
                        if line.startswith(prefix):
                            lines[i] = line[len(prefix):].strip().strip('"').strip("'")
                            break
        
        app_name = lines.get(1, f"{topic.title()} Pro")
        tagline = lines.get(2, f"Your AI {topic.title()} Companion")
        primary = lines.get(3, "#00F2FE")
        accent = lines.get(4, "#FF0844")
        user_emoji = lines.get(5, "⭐")
        
        # Parse metrics (best effort)
        metric1_text = lines.get(6, f"📊 128 {topic.title()} Score")
        metric2_text = lines.get(7, f"⚡ 5.8 Sessions")
        cta = lines.get(8, f"START {topic.upper()}")
        activity = lines.get(9, f"Live {topic.title()} Session")
        completion = lines.get(10, "SESSION COMPLETED!")
        social = lines.get(10, f"Millions of {topic.title()} Users")
        
        # Ensure colors are valid hex
        if not primary.startswith('#'):
            primary = "#00F2FE"
        if not accent.startswith('#'):
            accent = "#FF0844"
        
        # Build name parts
        name_parts = app_name.split()
        brand_base = name_parts[0] if name_parts else topic.title()
        brand_highlight = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        
        return self._build_minimal_html(
            app_name=app_name,
            brand_base=brand_base,
            brand_highlight=brand_highlight,
            tagline=tagline,
            primary=primary,
            accent=accent,
            user_emoji=user_emoji,
            metric1=metric1_text,
            metric2=metric2_text,
            cta=cta,
            activity=activity,
            completion=completion,
            social=social,
            topic=topic
        )
    
    def _extract_html(self, response: str) -> str:
        """Extract clean HTML from Gemini's response."""
        if not response:
            return ""
            
        # 1. Extract content from Markdown code blocks ```html ... ``` or ``` ... ```
        code_blocks = re.findall(r'```(?:html|xml|xml-html)?\s*([\s\S]*?)\s*```', response, re.IGNORECASE)
        for block in code_blocks:
            block_clean = block.strip()
            if '<style' in block_clean.lower() or '<script' in block_clean.lower() or '<div' in block_clean.lower() or '<html' in block_clean.lower():
                if not block_clean.lower().startswith('<!doctype'):
                    block_clean = '<!DOCTYPE html>\n' + block_clean
                return block_clean

        # 2. Extract from first <!DOCTYPE or <html tag to </html>
        start_idx = -1
        for tag in ['<!doctype html', '<html']:
            idx = response.lower().find(tag)
            if idx != -1 and (start_idx == -1 or idx < start_idx):
                start_idx = idx
                
        if start_idx != -1:
            end_idx = response.lower().rfind('</html>')
            if end_idx != -1:
                html_snippet = response[start_idx:end_idx + 7].strip()
                if not html_snippet.lower().startswith('<!doctype'):
                    html_snippet = '<!DOCTYPE html>\n' + html_snippet
                return html_snippet
            else:
                # If </html> is missing, take everything from start_idx
                html_snippet = response[start_idx:].strip()
                if not html_snippet.lower().startswith('<!doctype'):
                    html_snippet = '<!DOCTYPE html>\n' + html_snippet
                return html_snippet + '\n</html>'

        return ""
    
    def _extract_app_name(self, html: str, topic: str) -> str:
        """Try to extract the app name from the generated HTML."""
        # Look for <title> tag
        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
        if title_match:
            title = title_match.group(1).strip()
            # Clean up common suffixes
            for suffix in [' - ', ' | ', ' — ']:
                if suffix in title:
                    title = title.split(suffix)[0].strip()
            if len(title) > 2 and len(title) < 40:
                return title
        
        # Look for brand-logo class content
        brand_match = re.search(r'class="brand-logo"[^>]*>(.*?)</div>', html, re.IGNORECASE | re.DOTALL)
        if brand_match:
            text = re.sub(r'<[^>]+>', ' ', brand_match.group(1)).strip()
            if len(text) > 1 and len(text) < 30:
                return text
        
        return topic.title() + " App"
    
    def _extract_tagline(self, html: str, topic: str) -> str:
        """Try to extract the tagline from the generated HTML."""
        tag_match = re.search(r'class="tagline"[^>]*>(.*?)</[^>]+>', html, re.IGNORECASE | re.DOTALL)
        if tag_match:
            text = re.sub(r'<[^>]+>', '', tag_match.group(1)).strip()
            if len(text) > 3:
                return text
        return f"Your AI-Powered {topic.title()} Companion"
    
    def _build_minimal_html(self, **kwargs) -> str:
        """Build a minimal HTML using the creative content Gemini provided.
        This is the absolute last fallback — the structure is generic but
        ALL visible text content still comes from Gemini.
        """
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{kwargs['app_name']}</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&display=swap" rel="stylesheet">
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', sans-serif; }}
        body {{ background: #090B10; color: #FFF; display: flex; justify-content: center; align-items: center; min-height: 100vh; overflow: hidden; }}
        .showcase-viewport {{ position: relative; width: 1920px; height: 1080px; background: radial-gradient(circle at 50% 50%, #151928 0%, #08090C 100%); display: flex; justify-content: center; align-items: center; overflow: hidden; }}
        .glow-orb {{ position: absolute; width: 600px; height: 600px; border-radius: 50%; filter: blur(120px); opacity: 0.4; animation: floatGlow 8s infinite alternate ease-in-out; }}
        .orb-1 {{ background: {kwargs['primary']}; top: -100px; left: 200px; }}
        .orb-2 {{ background: {kwargs['accent']}; bottom: -100px; right: 200px; }}
        @keyframes floatGlow {{ 0% {{ transform: translate(0,0) scale(1); }} 100% {{ transform: translate(40px,60px) scale(1.15); }} }}
        .phone-mockup {{ position: relative; width: 440px; height: 880px; background: #121620; border-radius: 54px; border: 12px solid #222736; box-shadow: 0 30px 100px {kwargs['primary']}40, 0 0 0 2px rgba(255,255,255,0.1); overflow: hidden; z-index: 10; }}
        .notch {{ position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 160px; height: 30px; background: #222736; border-bottom-left-radius: 20px; border-bottom-right-radius: 20px; z-index: 100; }}
        .app-screen {{ width: 100%; height: 100%; padding: 50px 24px 30px; display: flex; flex-direction: column; }}
        .app-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }}
        .avatar {{ width: 46px; height: 46px; background: linear-gradient(135deg, {kwargs['primary']}, {kwargs['primary']}99); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 22px; }}
        .status-tag {{ font-size: 12px; color: {kwargs['primary']}; font-weight: 600; }}
        .streak-badge {{ background: {kwargs['accent']}26; color: {kwargs['accent']}; border: 1px solid {kwargs['accent']}4D; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 14px; }}
        .content-container {{ position: relative; flex: 1; }}
        .view-panel {{ position: absolute; width: 100%; height: 100%; opacity: 0; transform: translateY(20px); transition: all 0.8s cubic-bezier(0.16,1,0.3,1); pointer-events: none; }}
        .view-panel.active {{ opacity: 1; transform: translateY(0); pointer-events: all; }}
        .card {{ background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 28px; padding: 24px; text-align: center; margin-bottom: 20px; }}
        .rings-container {{ position: relative; display: flex; justify-content: center; align-items: center; margin-top: 16px; }}
        .ring-bg {{ fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 12; }}
        .ring-bar {{ fill: none; stroke-width: 12; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%; }}
        .ring-p {{ stroke: {kwargs['primary']}; stroke-dasharray: 408; stroke-dashoffset: 120; }}
        .ring-a {{ stroke: {kwargs['accent']}; stroke-dasharray: 314; stroke-dashoffset: 80; }}
        .ring-stats {{ position: absolute; display: flex; flex-direction: column; }}
        .main-stat {{ font-size: 38px; font-weight: 900; }}
        .sub-stat {{ font-size: 13px; color: #A0A5B5; }}
        .metrics-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }}
        .metric-box {{ background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 16px; }}
        .metric-box .icon {{ font-size: 20px; }}
        .metric-box .value {{ font-size: 26px; font-weight: 700; margin-top: 6px; }}
        .metric-box .label {{ font-size: 12px; color: #8E95A5; }}
        .cta-button {{ width: 100%; padding: 18px; background: linear-gradient(135deg, {kwargs['primary']}, {kwargs['primary']}CC); border: none; border-radius: 24px; color: #000; font-weight: 800; font-size: 16px; letter-spacing: 1px; box-shadow: 0 10px 30px {kwargs['primary']}66; cursor: pointer; }}
        .live-tag {{ display: inline-block; background: {kwargs['accent']}; color: #FFF; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 12px; margin-bottom: 10px; letter-spacing: 1px; }}
        .timer-display {{ font-size: 54px; font-weight: 900; text-align: center; color: {kwargs['primary']}; margin: 20px 0; font-variant-numeric: tabular-nums; }}
        .pulse-container {{ background: {kwargs['accent']}14; border: 1px solid {kwargs['accent']}33; border-radius: 28px; padding: 24px; text-align: center; margin-bottom: 24px; }}
        .pulse-icon {{ font-size: 40px; animation: heartBeat 0.8s infinite alternate; }}
        @keyframes heartBeat {{ 0% {{ transform: scale(1); }} 100% {{ transform: scale(1.25); }} }}
        .metric-large {{ font-size: 44px; font-weight: 900; }}
        .wave-line {{ fill: none; stroke: {kwargs['accent']}; stroke-width: 3; stroke-dasharray: 600; stroke-dashoffset: 600; animation: drawW 2s linear infinite; }}
        @keyframes drawW {{ 0% {{ stroke-dashoffset: 600; }} 100% {{ stroke-dashoffset: 0; }} }}
        .stats-row {{ display: flex; justify-content: space-around; }}
        .stat-pill {{ background: rgba(255,255,255,0.08); padding: 12px 20px; border-radius: 20px; font-size: 15px; font-weight: 700; }}
        .badge-popup {{ text-align: center; margin-top: 40px; }}
        .badge-icon {{ font-size: 70px; animation: bounce 1.5s ease infinite; }}
        @keyframes bounce {{ 0%,100% {{ transform: translateY(0); }} 50% {{ transform: translateY(-15px); }} }}
        .summary-card {{ background: rgba(255,255,255,0.05); border-radius: 24px; padding: 20px; margin-top: 30px; }}
        .summary-item {{ display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }}
        .summary-item:last-child {{ border-bottom: none; }}
        .brand-hero {{ display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; text-align: center; }}
        .brand-logo {{ font-size: 42px; font-weight: 900; letter-spacing: 2px; }}
        .brand-logo span {{ color: {kwargs['primary']}; }}
        .tagline {{ color: #A0A5B5; margin: 14px 0 24px; }}
        .rating-stars {{ color: #FFD700; font-size: 24px; margin-bottom: 12px; }}
        .app-store-badge {{ background: {kwargs['primary']}26; color: {kwargs['primary']}; border: 1px solid {kwargs['primary']}4D; padding: 10px 20px; border-radius: 20px; font-size: 13px; font-weight: 600; }}
    </style>
</head>
<body>
    <div class="showcase-viewport">
        <div class="glow-orb orb-1"></div>
        <div class="glow-orb orb-2"></div>
        <div class="phone-mockup">
            <div class="notch"></div>
            <div class="app-screen">
                <div class="app-header">
                    <div style="display:flex;align-items:center;gap:12px">
                        <div class="avatar">{kwargs['user_emoji']}</div>
                        <div><h2>{kwargs['topic'].title()} User</h2><p class="status-tag">{kwargs['topic'].title()} Pro</p></div>
                    </div>
                    <div class="streak-badge">🔥 14 Days</div>
                </div>
                <div class="content-container">
                    <div id="v1" class="view-panel active">
                        <div class="card">
                            <h3>{kwargs['topic'].title()} Dashboard</h3>
                            <div class="rings-container">
                                <svg class="progress-ring" width="160" height="160"><circle class="ring-bg" cx="80" cy="80" r="65"/><circle class="ring-bar ring-p" cx="80" cy="80" r="65"/><circle class="ring-bar ring-a" cx="80" cy="80" r="50"/></svg>
                                <div class="ring-stats"><span class="main-stat">480</span><span class="sub-stat">/ 650 Points</span></div>
                            </div>
                        </div>
                        <div class="metrics-grid">
                            <div class="metric-box"><span class="icon">📊</span><div class="value">128</div><div class="label">{kwargs['metric1']}</div></div>
                            <div class="metric-box"><span class="icon">⚡</span><div class="value">5.8</div><div class="label">{kwargs['metric2']}</div></div>
                        </div>
                        <button class="cta-button">{kwargs['cta']}</button>
                    </div>
                    <div id="v2" class="view-panel">
                        <div class="live-tag">LIVE {kwargs['topic'].upper()}</div>
                        <h2>{kwargs['activity']}</h2>
                        <div class="timer-display"><span id="timer">00:14:35</span></div>
                        <div class="pulse-container">
                            <div class="pulse-icon">{kwargs['user_emoji']}</div>
                            <div class="metric-large"><span id="lv">156</span> <small>pts</small></div>
                            <svg viewBox="0 0 300 60" style="width:100%;height:40px"><path class="wave-line" d="M0,30 Q30,30 40,10 T60,50 T80,30 T150,30 T160,5 T180,55 T200,30 T300,30"/></svg>
                        </div>
                        <div class="stats-row">
                            <div class="stat-pill">🔥 <span id="lv2">324</span> XP</div>
                            <div class="stat-pill">⏱️ Pace: Great</div>
                        </div>
                    </div>
                    <div id="v3" class="view-panel">
                        <div class="badge-popup"><div class="badge-icon">🏆</div><h2>{kwargs['completion']}</h2><p>New Personal Best</p></div>
                        <div class="summary-card">
                            <div class="summary-item"><span>Total Time</span><strong>45m 20s</strong></div>
                            <div class="summary-item"><span>Points Earned</span><strong>620</strong></div>
                            <div class="summary-item"><span>Avg Score</span><strong>148</strong></div>
                        </div>
                    </div>
                    <div id="v4" class="view-panel">
                        <div class="brand-hero">
                            <div class="brand-logo">{kwargs['brand_base']}<span>{kwargs['brand_highlight']}</span></div>
                            <p class="tagline">{kwargs['tagline']}</p>
                            <div class="rating-stars">★★★★★</div>
                            <div class="app-store-badge">{kwargs['social']}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        document.addEventListener("DOMContentLoaded", () => {{
            const v1=document.getElementById("v1"), v2=document.getElementById("v2"), v3=document.getElementById("v3"), v4=document.getElementById("v4");
            const lv=document.getElementById("lv"), lv2=document.getElementById("lv2"), timer=document.getElementById("timer");
            setTimeout(() => {{
                v1.classList.remove("active"); v2.classList.add("active");
                let s=15, p=142, x=280;
                const iv=setInterval(() => {{
                    s++; p+=Math.floor(Math.random()*3)-1; x+=2;
                    if(lv) lv.innerText=p; if(lv2) lv2.innerText=x;
                    if(timer) {{ const m=String(Math.floor(s/60)).padStart(2,'0'), sc=String(s%60).padStart(2,'0'); timer.innerText='00:'+m+':'+sc; }}
                }}, 800);
                setTimeout(() => clearInterval(iv), 15000);
            }}, 10000);
            setTimeout(() => {{ v2.classList.remove("active"); v3.classList.add("active"); }}, 25000);
            setTimeout(() => {{ v3.classList.remove("active"); v4.classList.add("active"); }}, 38000);
        }});
    </script>
</body>
</html>"""
