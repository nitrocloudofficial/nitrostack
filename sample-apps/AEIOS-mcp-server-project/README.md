# AEIOS-X — Autonomous Enterprise Intelligent Operating System

An Enterprise AI Operating System that serves as a centralized intelligence layer for organizations. AEIOS-X orchestrates enterprise workflows, intelligent agents, APIs, and external tools through a modular architecture.

## Architecture

```
User → NitroStudio → NitroStack MCP Server → AEIOS-X FastAPI Backend → Enterprise Orchestrator
```

### Python Backend (FastAPI)
- Enterprise orchestration and business logic
- AI processing with Groq LLM integration
- Pipeline execution and multi-agent coordination

### NitroStack MCP Server (TypeScript)
- Official NitroStack SDK integration
- MCP Tools: Intent Analysis, Pipeline Orchestration, Knowledge Management, Agent Coordination, Decision Engine
- MCP Resources and Prompts for enterprise workflows

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 20+
- Groq API key

### Setup

```bash
# Clone
git clone https://github.com/Vivethasri985/AEIOS-X.git
cd AEIOS-X

# Configure environment
cp .env.example .env
# Edit .env with your GROQ_API_KEY

# Start FastAPI backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000

# Start NitroStack MCP server
cd nitrostack-server
npm install
npm run dev
```

### API Endpoints
- `POST /chat` — Chat with the AI system
- `POST /pipeline` — Execute enterprise pipeline
- `GET /health` — Health check
- `GET /status` — System status
- `GET /version` — Version info

## MCP Components

### Tools
- **Intent Analysis** — Understand and classify user requests
- **Pipeline Orchestration** — Execute multi-step enterprise workflows
- **Knowledge Management** — Store and retrieve enterprise knowledge
- **Agent Coordination** — Manage and coordinate AI agents
- **Decision Engine** — Conflict resolution and consensus

### Resources
- AEIOS Chat Resource
- Pipeline Resource
- Knowledge Blackboard

### Prompts
- AEIOS Enterprise Prompt
- Pipeline Orchestration Prompt

## Tech Stack
- **Backend:** Python, FastAPI, Groq SDK
- **MCP Server:** TypeScript, NitroStack SDK
- **Deployment:** NitroCloud, Docker

## License
See [LICENSE](LICENSE) for details.
