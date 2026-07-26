# Knowledge Graph & System Architecture — Universal Director Agent

```mermaid
graph TD
    %% Node Definitions
    User[User / CLI Input] -->|Topic String e.g. 'netflix'| Orchestrator[UniversalDirectorAgent]

    subgraph LLM_Layer["Web Gemini LLM Engine"]
        Orchestrator -->|1. Request Bespoke Code| AnimGen[AnimationGenerator]
        AnimGen -->|Playwright Chromium| GeminiWeb[gemini.google.com]
        GeminiWeb -->|1000+ Line HTML/CSS/JS| AnimCode[Bespoke Animation HTML]
        
        Orchestrator -->|2. Request Narration| ScriptWriter[ScriptWriter]
        ScriptWriter -->|Inspect HTML Text| GeminiWeb
        GeminiWeb -->|135-Word Narrative| AudioScript[Voiceover Text]
    end

    subgraph Media_Layer["Audio & Subtitle Synthesis"]
        AudioScript -->|Edge-TTS Engine| AudioFile[MP3 Audio Track]
        AudioScript -->|Edge-TTS Engine| CaptionFile[VTT Subtitles]
    end

    subgraph Render_Layer["Playwright 3D Capture & Video Composition"]
        AnimCode -->|Render in 1920x1080 Viewport| PlaywrightRec[Playwright Chromium Recorder]
        PlaywrightRec -->|Isolated Temp Folder| WebMVideo[Raw WebM Video Stream]
        
        WebMVideo -->|FFmpeg Encoder| Composer[UniversalComposer]
        AudioFile -->|Merge Audio| Composer
        CaptionFile -->|Burn Subtitles| Composer
        
        Composer -->|LibX264 1080p| FinalMP4[Final Demo Video MP4]
    end

    %% Styling
    classDef primary fill:#2563eb,stroke:#1d4ed8,color:#fff,font-weight:bold;
    classDef secondary fill:#7c3aed,stroke:#6d28d9,color:#fff;
    classDef success fill:#059669,stroke:#047857,color:#fff;

    class User,Orchestrator primary;
    class GeminiWeb,AnimGen,ScriptWriter secondary;
    class FinalMP4 success;
```

## System Component Knowledge Graph

### 1. Orchestration Node (`agents/universal_director/agent.py`)
- **Role**: Central controller managing the 4-phase video synthesis pipeline.
- **Inputs**: Topic string (e.g. `"creator economy"`, `"netflix"`, `"apple siri"`, `"space fitness"`).
- **Outputs**: Path to compiled 1080p MP4 product demo video.

### 2. Bespoke Code Generator (`agents/universal_director/animation_generator.py`)
- **Role**: Prompts Web Gemini via automated visible Chromium browser to invent a unique UI, 3D perspective layout, SVG animations, glassmorphic floating bubbles, and auto-advancing JS timeline.
- **Key Characteristics**: Zero static templates; generates up to 1000+ lines of custom HTML/CSS/JS per topic.

### 3. Synchronized Script Writer (`agents/universal_director/script_writer.py`)
- **Role**: Reads the generated HTML text and prompts Web Gemini for a high-energy 130-140 word narration.
- **Alignment**: Aligns narrative pacing to match the 45-second visual animation timeline.

### 4. Speech & Subtitle Engine (`edge_tts`)
- **Role**: Converts narrative text to broadcast-quality audio (`.mp3`) and timed subtitles (`.vtt`).

### 5. Playwright & FFmpeg Composer (`agents/universal_director/composer.py`)
- **Role**: Records the auto-advancing 3D HTML animation in an isolated recording directory (`temp_rec_<topic>`), merges audio, burns subtitles, and outputs the final `.mp4`.
