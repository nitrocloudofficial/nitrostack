# AI Competitive Research Assistant (NitroStack MCP)

> **Hackathon Edition**: An end-to-end AI agent & interactive widget platform built on NitroStack MCP for automated startup competitive intelligence, web discovery, feature matrix comparison, and strategic market gap analysis.

---

## 🌟 Overview

The **AI Competitive Research Assistant** takes a raw startup or product idea and automatically executes a **7-step competitive research pipeline** over the Model Context Protocol (MCP):

1. **`understand_idea`**: Analyzes the idea into category, core problem, target audience, value prop, and search terms.
2. **`discover_competitors`**: Performs deterministic web search (Tavily) to discover real competitors.
3. **`extract_competitor_profiles`**: Gathers deep company profiles (pricing, features, tech stack, funding, strengths/weaknesses, USP).
4. **`compare_competitors`**: Builds comparative feature matrix tables and identifies market leaders.
5. **`market_gap_analysis`**: Identifies unaddressed customer problems and whitespace opportunities.
6. **`innovation_scoring`**: Calculates an Innovation Potential Index score across 4 key dimensions.
7. **`generate_report`**: Synthesizes a C-level executive strategy report.

All 7 steps are orchestratable via a single master tool: **`run_competitive_research`**!

---

## 🏗️ Architecture

```text
 ┌────────────────────────────────────────────────────────┐
 │            End User / LLM (NitroStudio / MCP)          │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │           run_competitive_research (Orchestrator)      │
 └───────────────────────────┬────────────────────────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     ▼                       ▼                       ▼
┌───────────────┐   ┌────────────────┐   ┌──────────────────────┐
│  IdeaService  │   │ TavilyClient   │   │  GeminiService       │
│  (NLP Parsing)│   │ (Live Search)  │   │  (Structured Output) │
└───────────────┘   └────────────────┘   └──────────────────────┘
     │                       │                       │
     └───────────────────────┼───────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │           NitroStack UI Widgets (@Widget SDK)          │
 │  - /idea-summary           - /competitor-list           │
 │  - /competitor-profile     - /competitor-comparison    │
 │  - /pipeline-progress                                  │
 └────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18 or higher
- **npm**: v9 or higher

### 2. Environment Variables Setup
Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

*(Note: If `TAVILY_API_KEY` is omitted or set to a placeholder, the system gracefully uses high-quality simulated competitor search data).*

### 3. Installation
```bash
npm install
```

### 4. Build Workspace
```bash
npm run build
```

### 5. Run Development Server with Widgets
```bash
npm run dev
```

---

## 🛠️ MCP Tools Reference

| Tool Name | Input Schema | Interactive Widget | Description |
| :--- | :--- | :--- | :--- |
| **`run_competitive_research`** | `{ idea, industry?, geography?, targetAudience? }` | `/pipeline-progress` | Master orchestrator tool executing the entire 7-step pipeline. |
| **`understand_idea`** | `{ idea, industry?, geography?, targetAudience? }` | `/idea-summary` | Deconstructs startup idea into structured components. |
| **`discover_competitors`** | `{ idea, category?, coreProblem?, valueProposition?, keywords? }` | `/competitor-list` | Live web search (Tavily) to discover competitors. |
| **`extract_competitor_profiles`** | `{ competitors, ideaAnalysis? }` | `/competitor-profile` | Extracts pricing, features, tech stack, funding, strengths/weaknesses. |
| **`compare_competitors`** | `{ profiles }` | `/competitor-comparison` | Generates feature comparison table, winner badges, and market leader rankings. |

---

## 📂 Project Structure

```text
c:\Nitroooo\
├── src/
│   ├── api/                  # External API clients (TavilyClient with retry logic)
│   ├── modules/              # MCP Tool Controllers (@Tool & @Widget decorators)
│   ├── services/             # Core Business Logic & AI Pipeline Services
│   ├── types/                # Strict Zod Schemas & TypeScript interfaces
│   ├── widgets/              # Next.js 14 Interactive Frontend Widgets
│   │   ├── app/
│   │   │   ├── idea-summary/
│   │   │   ├── competitor-list/
│   │   │   ├── competitor-profile/
│   │   │   ├── competitor-comparison/
│   │   │   └── pipeline-progress/
│   │   ├── widget-manifest.json
│   │   └── next.config.js
│   ├── app.module.ts         # Root AppModule
│   └── index.ts              # Server Entry Point
├── dist/                     # Compiled Production Server
├── package.json
└── README.md
```

---

## 🧪 Testing in NitroStudio

1. Download & open **NitroStudio** ([https://nitrostack.ai/studio](https://nitrostack.ai/studio)).
2. Connect to local project (`c:\Nitroooo`).
3. Select `run_competitive_research` under **Tools**.
4. Enter input:
   ```json
   {
     "idea": "An AI-powered interview prep platform with live mock interviews and feedback"
   }
   ```
5. Click **Execute Tool** to view the live 7-step progress tracker and synthesized executive report widget!

---

## 📜 License
MIT License. Built for the NitroStack MCP Hackathon.
