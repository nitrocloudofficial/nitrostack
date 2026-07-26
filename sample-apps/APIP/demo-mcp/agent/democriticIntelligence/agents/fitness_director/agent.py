import os
import subprocess
from ..demo.gemini_web_llm import GeminiWebLLM
from .composer import FitnessComposer

class FitnessDirectorAgent:
    """Director 2 Agent: Automated Director for Fitness App Product Demonstrations."""
    
    def __init__(self):
        self.llm = GeminiWebLLM()
        self.composer = FitnessComposer()

    def run_director_pipeline(self):
        print("==================================================")
        print("Starting Director 2: PulseFit App Showcase Pipeline")
        print("==================================================")
        
        # 1. Ask Web Gemini for the Director's Narration Script
        prompt = (
            "You are a World-Class Creative Director for high-tech fitness product launches.\n"
            "Generate a high-energy, inspiring 45-second narration script (~135 words total) for the PulseFit app.\n"
            "Scenes to narrate:\n"
            "Scene 1: Introduction to PulseFit personal activity tracking.\n"
            "Scene 2: Real-time heart rate monitoring, calorie burn, and ECG pulse tracking during HIIT workout.\n"
            "Scene 3: Completing workout goals and earning achievement trophies.\n"
            "Scene 4: Call to Action: PulseFit - Transform Your Limits Today.\n\n"
            "Return ONLY plain text of the full voiceover script."
        )
        
        print("[FitnessDirector] Asking Web Gemini for Creative Director narration script...")
        script_text = self.llm.ask_gemini(prompt)
        
        if not script_text or len(script_text) < 40:
            print("[FitnessDirector] Using fallback Creative Director script...")
            script_text = (
                "Welcome to PulseFit, the ultimate AI-powered fitness companion engineered to elevate your training. "
                "Track your daily activity goals with dynamic progress rings, real-time heart rate monitoring, and calorie metrics. "
                "Step into live workout mode, where intelligent biometric tracking monitors your pulse, pace, and intensity in real time. "
                "Celebrate every milestone as PulseFit automatically logs your personal records and awards achievement badges for your dedication. "
                "Over ten million athletes trust PulseFit to reach peak performance. Download PulseFit today and transform your limits."
            )
            
        print(f"[FitnessDirector] Script Generated ({len(script_text.split())} words):\n{script_text}\n")
        
        # 2. Generate Voiceover and Subtitles using Edge-TTS
        audio_file = "fitness_voiceover.mp3"
        captions_file = "fitness_captions.vtt"
        
        print("[FitnessDirector] Generating AI Voiceover & Synced Subtitles...")
        try:
            subprocess.run([
                "python", "-m", "edge_tts",
                "--text", script_text,
                "--write-media", audio_file,
                "--write-subtitles", captions_file
            ], check=True)
            print("[FitnessDirector] Voiceover & Subtitles generated successfully!")
        except Exception as e:
            print(f"[FitnessDirector] Edge-TTS error: {e}")

        # 3. Render 1080p Video with Subtitles
        video_output = self.composer.compose(audio_track=audio_file, captions_file=captions_file)
        
        print(f"\n[FitnessDirector] Director 2 Pipeline Complete! Output: {video_output}")
        return video_output

if __name__ == "__main__":
    director = FitnessDirectorAgent()
    director.run_director_pipeline()
