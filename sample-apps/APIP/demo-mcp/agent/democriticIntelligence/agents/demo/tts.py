import subprocess

class VoiceGenerator:
    """Converts script into speech using a TTS provider."""
    
    def __init__(self, provider: str = "edge-tts"):
        self.provider = provider
        
    def generate_voice(self, scripts: dict[int, str]) -> dict[int, str]:
        # Concatenate all scripts into one continuous narrative
        full_text = " ".join([text for text in scripts.values() if text])
        
        voice_path = "voiceover.mp3"
        captions_path = "captions.vtt"
        
        print(f"Generating AI Voiceover using {self.provider}...")
        try:
            # Generate audio and perfectly synced VTT subtitles
            subprocess.run([
                "python", "-m", "edge_tts", 
                "--text", full_text, 
                "--write-media", voice_path, 
                "--write-subtitles", captions_path
            ], check=True)
            print("Voiceover and Subtitles generated successfully!")
        except Exception as e:
            print(f"Failed to run edge-tts: {e}")
            
        return {1: voice_path}
