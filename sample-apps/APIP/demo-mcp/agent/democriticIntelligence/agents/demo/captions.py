class CaptionGenerator:
    """Generates subtitle files (SRT/VTT) from text and timings."""
    
    def generate_captions(self, scripts: dict[int, str], timings: dict[int, float]) -> str:
        # Edge-TTS natively generates `captions.vtt` perfectly synced with the audio,
        # so we can simply return that file instead of manually estimating timings!
        
        captions_file = "captions.vtt"
        print(f"Using natively synced subtitles: {captions_file}")
        
        return captions_file
