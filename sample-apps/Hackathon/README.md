# HELIX — Enterprise Cognitive Genome & Behavioral Drift Platform

> **Real-time AI-powered organizational intelligence that detects, quantifies, and auto-remediates strategic drift across enterprise departments using vector embeddings, GraphRAG, and LLM-driven diagnostics.**

## The Problem

In large enterprises, leadership defines Standard Operating Procedures (SOPs), security mandates (SOC2), architecture decision records (ADRs), and strategic roadmaps. But as thousands of daily decisions happen across Slack, Jira, Git, and meetings, **organizational cognitive drift** silently compounds — the gap between what leadership *commanded* and what employees *actually do*.

Traditional tools (KPI dashboards, velocity charts) are **lagging indicators**. They only detect failure *after* a security breach, audit failure, or missed deadline. They cannot measure **semantic divergence** in real-time communication.

## How HELIX Solves This

HELIX acts as an **automated organizational nervous system** that:

1. **Ingests** unstructured operational telemetry (Slack, Git commits, Jira tickets, meeting minutes, contracts)
2. **Embeds** all content into a 1,536-dimensional cognitive vector space using Qwen transformer models
3. **Continuously compares** daily execution against established strategic baselines using Hybrid RAG (Vector + BM25 + RRF)
4. **Quantifies drift** across a 4-Vector Cognitive Genome: Strategic Alignment, Process Consistency, Conceptual Cohesion, Knowledge Retention
5. **Auto-remediates** via Slack nudge bots, Jira policy banners, and executive email escalations

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    HELIX Platform Architecture                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    ┌──────────────────────────────┐    │
│  │  ZNA Dataset     │    │   Pipeline (Python Backend)   │    │
│  │  280+ Documents  │───▶│   • Qwen Embedding Engine     │    │
│  │  • SOPs, ADRs    │    │   • Qdrant Vector DB          │    │
│  │  • Slack, Git    │    │   • Hybrid RAG + GraphRAG     │    │
│  │  • Emails, Mins  │    │   • LLM Drift Diagnostics     │    │
│  │  • Contracts     │    │   • Neo4j Knowledge Graph     │    │
│  │  • Employees     │    │                                │    │
│  └─────────────────┘    └───────────┬──────────────────┘    │
│                                     │ REST API :8000         │
│                                     ▼                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        Helix Dashboard (NitroStack MCP + Next.js)     │   │
│  │  • 3D Genome Space Visualization                      │   │
│  │  • Live Telemetry Stream + Signal Injection            │   │
│  │  • Behavioral Drift Heatmap Matrix                    │   │
│  │  • Department Inspector Drawer                        │   │
│  │  • Nudge & Intervention Hub                           │   │
│  │  • AI Chatbot (GraphRAG Q&A)                          │   │
│  │  • Genome Studio (Baseline Management)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                         UI :3001                             │
└──────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Embeddings** | Qwen2-1.5B / GTE-Qwen (1,536 dimensions) via SentenceTransformers |
| **Vector DB** | Qdrant (Cosine Similarity Index) |
| **Knowledge Graph** | Neo4j (GraphRAG multi-hop retrieval) |
| **LLM Engine** | Qwen3-8B / Gemini (drift diagnosis & reasoning) |
| **Backend API** | Python HTTP Server with CORS & SSE support |
| **Frontend** | Next.js 14 + React 18 + Framer Motion |
| **MCP Server** | NitroStack TypeScript (tools, resources, widgets) |
| **Orchestration** | Docker Compose (Qdrant + Neo4j containers) |

## Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Docker** (for Qdrant & Neo4j containers)

### 1. Clone & Setup

```bash
git clone https://github.com/rssssssssssssssssssssss/nitrostack.git
cd nitrostack/sample-apps/Hackathon
```

### 2. Start Docker Services (Vector DB + Graph DB)

```bash
docker-compose up -d
```

### 3. Start the Backend AI Server (Port 8000)

```powershell
# PowerShell
.\start.ps1
```

Or manually:
```bash
python -m venv .venv
# Windows: .\.venv\Scripts\Activate.ps1
# Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=$(pwd)  # or $env:PYTHONPATH = (Get-Location).Path on PowerShell
python pipeline/server/main.py
```

### 4. Ingest the Dataset (First Run Only)

```bash
python pipeline/embedding/ingest_dataset.py
```

### 5. Start the Dashboard UI (Port 3001)

```bash
cd helix-dashboard/src/widgets
npm install
npm run dev
```

### 6. Open in Browser

- **Dashboard UI**: http://localhost:3001
- **Backend API**: http://localhost:8000/health

## Project Structure

```
├── .env.example              # Environment variable template
├── .gitignore                # Git ignore rules
├── docker-compose.yml        # Qdrant + Neo4j Docker services
├── requirements.txt          # Python dependencies
├── start.ps1                 # One-click backend startup script
│
├── zna_dataset/              # Enterprise Knowledge Corpus (280+ docs)
│   ├── documents/            # SOPs, ADRs, Slack, Git, Emails, Contracts
│   ├── employees.json        # Organizational hierarchy (50+ profiles)
│   └── ground_truth/         # Benchmark queries & canonical graph
│
├── pipeline/                 # Python AI Backend
│   ├── embedding/            # Qwen Embedder, RAG, Qdrant, LLM, Prompts
│   ├── graphs/               # Cognitive Genome, Knowledge Graph Engine
│   ├── interpolation/        # Drift Engine, Recommendations, Webhooks
│   └── server/               # HTTP REST API Server (main.py)
│
└── helix-dashboard/          # NitroStack MCP Server + Frontend
    ├── src/
    │   ├── modules/          # MCP Tools (Helix drift analysis)
    │   ├── services/         # Embeddings, Qdrant, RAG, LLM services
    │   └── widgets/          # Next.js Dashboard UI
    │       └── app/
    │           ├── components/  # React UI Components
    │           │   ├── HelixApp.tsx         # Main orchestrator
    │           │   ├── GenomeSpace3D.tsx    # 3D genome visualization
    │           │   ├── TelemetryStream.tsx  # Live telemetry feed
    │           │   ├── HeatmapMatrix.tsx    # Drift heatmap grid
    │           │   ├── InterventionHub.tsx  # Nudge & remediation
    │           │   ├── DepartmentDrawer.tsx # Dept inspector drawer
    │           │   ├── GenomeStudio.tsx     # Baseline management
    │           │   ├── ChatBotUI.tsx        # AI Q&A assistant
    │           │   ├── MetricCard.tsx       # KPI metric cards
    │           │   └── Sidebar.tsx          # Navigation sidebar
    │           └── data/
    │               └── mockData.ts         # Type definitions & seed data
    └── package.json
```

## Key Features

### 🧬 4-Vector Cognitive Genome
Each department is profiled across Strategic Alignment, Process Consistency, Conceptual Cohesion, and Knowledge Retention — rendered as an interactive 3D orbital visualization.

### 📡 Live Telemetry Stream
Real-time ingestion feed showing operational signals from Slack, Teams, Jira, and Confluence with automated severity classification and LLM diagnostic reasoning.

### ⚡ Signal Injection (Stress Testing)
Inject synthetic operational events to stress-test drift detection in real-time — validates the entire pipeline from embedding to 3D visualization update.

### 🔥 Behavioral Drift Matrix
Comparative heatmap showing 7-day drift trajectories, top drift topics, and alert counts across all business units.

### 🤖 AI Inspector Chatbot
Conversational GraphRAG assistant for interrogating institutional memory with exact document citations and confidence scores.

### 🎯 Nudge & Intervention Hub
Automated remediation pipeline dispatching Slack nudge bots, Jira policy banners, and executive escalation alerts with 91.2% action rate.

## License

MIT
