# 🎮 Curio — AI-Powered Gamified Learning Engine

> **Turn any topic into an interactive 2D platformer game — powered by a single AI prompt.**

Curio is an MCP (Model Context Protocol) server built on the NitroStack framework that transforms any educational concept into a fully playable, voice-narrated 2D platformer game — in real time, inside NitroStudio.

---

## ✨ What It Does

Type a single prompt like *"Teach me about Photosynthesis"* into any MCP-compatible AI agent, and Curio instantly generates:

- A **complete 3-level 2D platformer game** with escalating difficulty
- **3–5 interactive checkpoints** per level — each with a different puzzle type (Sequence, Collector, Match)
- **Voice narration** using a custom Human Prosody Engine — natural pauses, pitch modulation, clause-level chunking
- **A Boss Battle quiz** at the end of every level to test full comprehension
- **Dynamic visual theming** — sky, ground, enemies, and collectibles all styled to match the topic
- **8-bit synthesized audio** — every sound effect generated live via the Web Audio API. Zero audio files loaded.
- **Physical mastery gates** — you simply cannot progress without learning. The game architecture enforces it.

Curio can teach **anything** — Photosynthesis, Quantum Mechanics, Ancient History, Machine Learning, Law, Medicine, Philosophy, Financial Markets. Any concept. Any domain. Any field of human knowledge.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│              NitroStudio / MCP Client            │
│         (Claude, GPT, Gemini, any agent)         │
└────────────────────┬────────────────────────────┘
                     │  MCP Protocol (STDIO / HTTP SSE)
                     ▼
┌─────────────────────────────────────────────────┐
│            Curio MCP Server                      │
│  ┌─────────────────────────────────────────┐    │
│  │  TOOL: publish_2d_platformer            │    │
│  │  → Zod-validated game schema            │    │
│  │  → 3 levels × 3–5 checkpoints × quiz   │    │
│  └─────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────┐    │
│  │  RESOURCES                              │    │
│  │  → knowledge_base/hampi.json           │    │
│  │  → progress/{session_id}               │    │
│  │  → scene_cache/{chapter_id}            │    │
│  └─────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────┘
                     │  Widget render
                     ▼
┌─────────────────────────────────────────────────┐
│            OmniGame Widget (React)               │
│  • Custom physics engine (60fps, no libraries)   │
│  • Human Prosody Voice Engine (Web Speech API)   │
│  • 8-bit audio synthesizer (Web Audio API)       │
│  • Pixel-art Mario-style player character        │
│  • Guide Emma AI narrator (voice + avatar)       │
│  • Particle fireworks system                     │
│  • Parallax scrolling 3000px world               │
└─────────────────────────────────────────────────┘
```

---

## 🧠 Learning Science Behind It

Curio is built on four scientifically proven pedagogical principles:

| Principle | How Curio Implements It |
|---|---|
| **Ebbinghaus Forgetting Curve** | Active engagement prevents passive decay |
| **Dual-Coding Theory** | Voice narration + visual gameplay activate two learning channels simultaneously |
| **Active Retrieval Practice** | Content is hidden during the challenge — learner retrieves from memory |
| **Bloom's Taxonomy** | 3 levels map to Knowledge → Comprehension → Application |
| **Spaced Repetition** | Wrong answers force a re-read loop before retrying |
| **Mastery-Based Progression** | Physical energy gates block all forward movement until checkpoint is solved |

---

## 📁 Project Structure

```
curio/
├── src/
│   ├── index.ts                          # MCP server entry point
│   ├── app.module.ts                     # Root module — registers all features
│   ├── health/
│   │   └── system.health.ts             # Health check endpoint
│   └── modules/
│       └── yatra/
│           ├── yatra.module.ts          # Feature module wiring
│           ├── yatra.tools.ts           # publish_2d_platformer tool + Zod schema
│           └── yatra.resources.ts       # MCP Resources (knowledge base, progress)
├── src/widgets/app/
│   └── OmniGame/
│       ├── page.tsx                     # Full game engine + UI (React)
│       ├── MarioSprite.tsx              # Pixel-art player character (SVG, no images)
│       ├── avatar_data.ts               # Guide Emma narrator avatar (base64)
│       └── player_data.ts               # Player sprite data
├── knowledge_base/
│   └── hampi.json                       # Curated knowledge base (MCP Resource)
├── .env.example                         # Environment variable reference
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js `>=18`
- npm `>=9`

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd curio
npm run install:all
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` as needed:

```env
NITRO_LOG_LEVEL=info
NITROSTACK_APP_MODE=universal

# Optional transport config
# MCP_TRANSPORT_TYPE=dual   # stdio | http | dual
# PORT=3000
# HOST=localhost
# ENABLE_CORS=true
```

### 3. Run in Development

```bash
npm run dev
```

This starts the MCP server with hot reload at `http://localhost:3000/mcp`.

### 4. Connect to NitroStudio

1. Open **NitroStudio**
2. Add a new MCP server with URL: `http://localhost:3000/mcp`
3. Open **AI Chat** and type: *"Teach me about Photosynthesis through an interactive game!"*
4. Watch Curio generate your game live ✨

---

## 🔧 MCP Tool Reference

### `publish_2d_platformer`

Generates and publishes a complete 3-level 2D interactive platformer game on any educational topic.

**Input Schema** (Zod-validated):

```typescript
{
  topic: string,                   // e.g. "Photosynthesis", "Mughal Empire"
  levels: Array<{                  // Exactly 3 levels
    infoBlocks: Array<{            // 3–5 checkpoints per level
      title: string,
      content: string,             // Core concept to teach
      puzzleType: 'sequence' | 'collector' | 'match',
      puzzlePrompt: string,
      puzzleItems: string[],       // Exactly 4 items
      puzzleTarget: string[]       // Correct answer(s)
    }>,
    bossQuiz: {
      question: string,
      options: string[],           // Exactly 4 options
      correctAnswer: string
    },
    visuals: {
      skyColor: string,            // CSS color
      groundColor: string,
      grassColor: string,
      playerEmoji: string,
      bossEmoji: string,
      collectibleEmoji: string,
      sceneryEmoji: string,
      obstacleEmoji: string
    }
  }>
}
```

---

## 🎮 Game Features

### Player & World
- **60fps physics engine** — built from scratch, no game libraries (no Unity, no Phaser)
- **Real gravity & momentum** with delta-time scaling
- **3000px parallax scrolling world** with multi-layer depth
- **Pixel-art Mario-style character** — standing, running (3-frame animation), jumping poses — all rendered as SVG pixel grids

### Audio Engine
- **100% synthesized audio** using Web Audio API oscillators — zero audio files
- Jump sound, step sound, collect sound, solve fanfare, error buzz, boss encounter rumble, win jingle, lose sound
- Fully mutable with a single toggle

### Voice Narration (Human Prosody Engine)
- Splits content into natural linguistic clauses at punctuation boundaries
- Applies **variable pitch** (1.02–1.25) and **variable speech rate** (0.92–0.96) per clause
- **Variable pause timing**: 180ms mid-clause, 320ms end-of-sentence
- Auto-selects best available natural female voice (Neural / Natural / Zira / Aria / Jenny)

### Checkpoint Puzzles (3 Types)
| Type | Description |
|---|---|
| **Sequence** | Arrange steps or events in the correct order |
| **Collector** | Select only the correct items from a mixed set |
| **Match** | Associate terms with their definitions |

### Progression System
- **Energy barrier walls** physically block forward movement until each checkpoint is solved
- **Wrong answer → forced re-read loop** — content reappears for review
- **Boss Battle quiz** synthesizes all checkpoint knowledge at end of level
- **3-level escalation**: Beginner → Intermediate → Advanced

---

## 🛠️ Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Build + start production server |
| `npm run start:prod` | Start pre-built production server |
| `npm run upgrade` | Upgrade NitroStack to latest version |
| `npm run install:all` | Install root + widget dependencies |

---

## 🌐 MCP Resources

| Resource URI | Description |
|---|---|
| `knowledge_base/hampi.json` | Curated facts about the Vijayanagara Empire |
| `progress/{session_id}` | Per-session learning progress tracker |
| `scene_cache/{chapter_id}` | Generated scene data for each chapter |

---

## 🏭 Transport Modes

| Mode | Use Case |
|---|---|
| `stdio` | Local development with Claude Desktop / NitroStudio |
| `http` | HTTP SSE for web-based MCP clients |
| `dual` | Production — supports both simultaneously |

---

## 🔮 Roadmap

- [ ] 3D game environments with Three.js
- [ ] Adaptive difficulty AI — adjusts in real time based on learner performance
- [ ] Multiplayer learning battles between students
- [ ] School curriculum alignment tools
- [ ] Progress persistence across sessions
- [ ] Mobile-responsive touch controls
- [ ] Multi-language narration support

---

## 🤝 Built With

| Technology | Role |
|---|---|
| [NitroStack](https://nitrostack.ai) | MCP server framework |
| [React](https://react.dev) | Widget rendering |
| [Zod](https://zod.dev) | Runtime schema validation |
| Web Speech API | Voice narration engine |
| Web Audio API | Synthesized 8-bit audio |
| TypeScript | Type-safe throughout |

---

## 📄 License

MIT

---

> *Curio — because curiosity is the most powerful learning engine ever built.*