import asyncio
import os
import subprocess
import time
import shutil

async def generate_narration():
    script_text = (
        "Welcome to the official Royal Challengers Bengaluru 2026 Season Launch! "
        "Scene one: Built on the core philosophy of Play Bold, RCB unveils its high-octane 2026 squad. "
        "Scene two: Powerplay dominance led by Virat Kohli and Faf du Plessis, driving an unmatched 145 strike rate. "
        "Scene three: Fortress Chinnaswamy, engineered for 200 plus run target chases. "
        "Scene four: 100 percent tactical simulation pass rate across 150 automated match scenarios. "
        "Scene five: Join the Bold Army and get ready to Play Bold!"
    )
    
    audio_file = "rcb_full_narration.mp3"
    print("-> Generating multi-scene voiceover narration with Edge-TTS...")
    import edge_tts
    communicate = edge_tts.Communicate(script_text, "en-US-GuyNeural")
    await communicate.save(audio_file)
    print(f"-> Audio narration generated: {audio_file}")
    return audio_file

def create_multi_scene_html():
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RCB 2026 Multi-Scene Motion Video</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --red: #EC1C24;
            --gold: #E3BA48;
            --dark: #07090E;
            --card-bg: rgba(18, 22, 32, 0.85);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Outfit', sans-serif; }
        body {
            background-color: var(--dark);
            color: #FFF;
            width: 1920px;
            height: 1080px;
            overflow: hidden;
            position: relative;
            background: radial-gradient(circle at 50% 30%, #2E0B10 0%, var(--dark) 75%);
        }

        /* Canvas Particle Glow */
        .glow-bg {
            position: absolute;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(236, 28, 36, 0.35) 0%, rgba(0,0,0,0) 70%);
            top: 20%;
            left: 35%;
            animation: pulseGlow 4s infinite alternate ease-in-out;
        }

        @keyframes pulseGlow {
            0% { transform: scale(0.9); opacity: 0.5; }
            100% { transform: scale(1.2); opacity: 0.9; }
        }

        /* Scenes */
        .scene {
            position: absolute;
            top: 0; left: 0; width: 1920px; height: 1080px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: scale(0.95);
            transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: none;
            padding: 4rem;
        }
        .scene.active {
            opacity: 1;
            transform: scale(1);
            pointer-events: auto;
        }

        /* Scene 1: Intro */
        .title-gold {
            font-size: 5rem;
            font-weight: 900;
            background: linear-gradient(135deg, #FFF 0%, var(--gold) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-transform: uppercase;
            letter-spacing: 4px;
        }
        .subtitle-red {
            font-size: 2.2rem;
            font-weight: 800;
            color: var(--red);
            letter-spacing: 8px;
            margin-top: 1rem;
        }

        /* Scene 2: Squad Pillars */
        .grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 2rem;
            width: 100%;
            margin-top: 3rem;
        }
        .card {
            background: var(--card-bg);
            border: 2px solid rgba(227, 186, 72, 0.3);
            border-radius: 20px;
            padding: 2rem;
            text-align: center;
            box-shadow: 0 15px 35px rgba(0,0,0,0.5);
            transform: translateY(40px);
            opacity: 0;
            transition: all 0.6s ease;
        }
        .scene.active .card {
            transform: translateY(0);
            opacity: 1;
        }
        .scene.active .card:nth-child(1) { transition-delay: 0.2s; }
        .scene.active .card:nth-child(2) { transition-delay: 0.4s; }
        .scene.active .card:nth-child(3) { transition-delay: 0.6s; }
        .scene.active .card:nth-child(4) { transition-delay: 0.8s; }

        .card-avatar {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--red), var(--gold));
            margin: 0 auto 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            font-weight: 900;
            color: var(--dark);
        }
        .card-name { font-size: 1.8rem; font-weight: 700; color: #FFF; }
        .card-role { font-size: 1.1rem; color: var(--gold); margin-top: 0.5rem; }

        /* Scene 3: Match Engine */
        .stat-banner {
            background: linear-gradient(90deg, rgba(236, 28, 36, 0.2), rgba(227, 186, 72, 0.2));
            border-left: 8px solid var(--red);
            padding: 2.5rem;
            border-radius: 16px;
            width: 80%;
            margin-top: 2rem;
        }
        .progress-bar-bg {
            background: rgba(255,255,255,0.1);
            height: 20px;
            border-radius: 10px;
            margin-top: 1rem;
            overflow: hidden;
        }
        .progress-bar-fill {
            background: linear-gradient(90deg, var(--red), var(--gold));
            height: 100%;
            width: 0%;
            transition: width 1.5s ease;
        }
        .scene.active .progress-bar-fill { width: 92%; }

        /* Scene 4: QA Dashboard */
        .qa-box {
            background: rgba(16, 185, 129, 0.15);
            border: 2px solid #10B981;
            border-radius: 20px;
            padding: 3rem;
            text-align: center;
            width: 70%;
        }
        .qa-score { font-size: 4rem; font-weight: 900; color: #10B981; }

        /* Scene 5: Finale */
        .trophy-icon { font-size: 8rem; animation: float 3s infinite ease-in-out; }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }

        /* Timeline Progress Indicator */
        .timeline {
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 15px;
        }
        .dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            transition: all 0.4s ease;
        }
        .dot.active {
            background: var(--gold);
            box-shadow: 0 0 15px var(--gold);
            transform: scale(1.4);
        }
    </style>
</head>
<body>
    <div class="glow-bg"></div>

    <!-- Scene 1: Intro -->
    <div class="scene active" id="scene1">
        <h1 class="title-gold">Royal Challengers Bengaluru</h1>
        <div class="subtitle-red">#PLAYBOLD 2026 SEASON LAUNCH</div>
    </div>

    <!-- Scene 2: Squad Pillars -->
    <div class="scene" id="scene2">
        <h2 class="title-gold" style="font-size: 3rem;">Squad Marquee Pillars</h2>
        <div class="grid-4">
            <div class="card">
                <div class="card-avatar">VK</div>
                <div class="card-name">Virat Kohli</div>
                <div class="card-role">Marquee Batsman</div>
            </div>
            <div class="card">
                <div class="card-avatar">Faf</div>
                <div class="card-name">Faf du Plessis</div>
                <div class="card-role">Team Captain</div>
            </div>
            <div class="card">
                <div class="card-avatar">RP</div>
                <div class="card-name">Rajat Patidar</div>
                <div class="card-role">Middle Order Anchor</div>
            </div>
            <div class="card">
                <div class="card-avatar">MS</div>
                <div class="card-name">Mohammed Siraj</div>
                <div class="card-role">Pace Spearhead</div>
            </div>
        </div>
    </div>

    <!-- Scene 3: Fortress Chinnaswamy -->
    <div class="scene" id="scene3">
        <h2 class="title-gold" style="font-size: 3rem;">Fortress Chinnaswamy Engine</h2>
        <div class="stat-banner">
            <h3 style="font-size: 2rem; color: var(--gold);">Powerplay Dominance Index</h3>
            <p style="font-size: 1.4rem; margin-top: 0.5rem;">Targeting 60+ runs in first 6 overs with 145.8 Strike Rate</p>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill"></div>
            </div>
        </div>
    </div>

    <!-- Scene 4: QA Dashboard -->
    <div class="scene" id="scene4">
        <h2 class="title-gold" style="font-size: 3rem;">Tactical Simulation QA</h2>
        <div class="qa-box" style="margin-top: 2rem;">
            <div class="qa-score">150 / 150 PASSED</div>
            <p style="font-size: 1.5rem; color: #FFF; margin-top: 1rem;">100% Win Probability Across 200+ Target Chase Scenarios</p>
        </div>
    </div>

    <!-- Scene 5: Finale -->
    <div class="scene" id="scene5">
        <div class="trophy-icon">🏆</div>
        <h1 class="title-gold" style="margin-top: 1rem;">Get Ready To Play Bold</h1>
        <div class="subtitle-red">ROYAL CHALLENGERS BENGALURU 2026</div>
    </div>

    <!-- Timeline Indicator -->
    <div class="timeline">
        <div class="dot active" id="dot1"></div>
        <div class="dot" id="dot2"></div>
        <div class="dot" id="dot3"></div>
        <div class="dot" id="dot4"></div>
        <div class="dot" id="dot5"></div>
    </div>

    <script>
        function setScene(num) {
            document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
            document.getElementById('scene' + num).classList.add('active');
            document.getElementById('dot' + num).classList.add('active');
        }

        // Expose timeline switcher to window
        window.setScene = setScene;
    </script>
</body>
</html>"""
    
    html_path = os.path.abspath("rcb_multi_scene.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"-> Created Multi-Scene Motion HTML: {html_path}")
    return html_path

def render_motion_frames_and_compile(html_file: str, audio_file: str):
    frames_dir = os.path.abspath("motion_frames")
    if os.path.exists(frames_dir):
        shutil.rmtree(frames_dir)
    os.makedirs(frames_dir)

    print("-> Capturing high-motion animation frames with Playwright (25 Seconds Total)...")
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto(f"file:///{html_file.replace('\\', '/')}")
        page.wait_for_timeout(500)

        # 25 seconds total duration, capture at 10 fps (250 frames) for smooth motion video
        total_duration_sec = 25.0
        fps = 10
        total_frames = int(total_duration_sec * fps)

        for i in range(total_frames):
            current_sec = i / fps
            
            # Switch scenes dynamically:
            # 0 - 5s: Scene 1
            # 5 - 10s: Scene 2
            # 10 - 15s: Scene 3
            # 15 - 20s: Scene 4
            # 20 - 25s: Scene 5
            scene_num = min(5, int(current_sec // 5) + 1)
            page.evaluate(f"window.setScene({scene_num})")
            
            frame_path = os.path.join(frames_dir, f"frame_{i:04d}.png")
            page.screenshot(path=frame_path)
            if i % 25 == 0:
                print(f"   [Frame Capture] {i}/{total_frames} frames rendered (Scene {scene_num})...")
            time.sleep(1 / fps)

        browser.close()

    print("-> Compiling high-definition MP4 video from multi-scene motion frames...")
    output_video = os.path.abspath("rcb_full_motion_showcase.mp4")
    
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
    print(f" SUCCESS: MULTI-SCENE ANIMATED MP4 VIDEO CREATED AT:")
    print(f" {output_video}")
    print(f"==================================================")
    return output_video

if __name__ == "__main__":
    audio = asyncio.run(generate_narration())
    html = create_multi_scene_html()
    render_motion_frames_and_compile(html, audio)
