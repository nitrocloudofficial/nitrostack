# 🛡️ VeriChain AI

### *Trust Every AI Decision Through Verified Evidence*

VeriChain AI is an **Enterprise Evidence Intelligence Platform** built using **Agentic AI + Model Context Protocol (MCP)**. 

Traditional AI assistants answer questions immediately without checking for version consistency, numeric accuracy, or signatory sign-offs. VeriChain AI solves this by coordinating a multi-agent orchestration graph (powered by **LangGraph**) to extract claims, cross-verify documents, calculate multi-dimensional risk matrices, and compile an interactive **Evidence Graph** mapping how documents connect to form a recommendation.

---

## 🚀 Key Features

- **Multi-Agent Orchestration Graph**: Implemented using LangGraph, coordinating 6 specialized agents.
- **Interactive Evidence Graph**: Visualizes connections between documents and recommendations using a draggable Vis.js network layout.
- **Model Context Protocol (MCP) Server**: Implements official Python MCP SDK with 10 tools, dynamic resources, and prompts.
- **Vibrant Dark Glassmorphic Dashboard**: A premium, unified SaaS layout built with Streamlit.
- **Multi-Dimensional Risk Matrix**: Computes category-wise Financial, Compliance, Operational, and Business risks.
- **Robust Offline Heuristics**: Falls back to NLP heuristic parsing if LLM API keys are not configured.

---

## 🛠️ Technology Stack

- **Python 3.12**
- **FastAPI** (REST Backend)
- **Streamlit** (Visual UI)
- **LangGraph** (Agent Graphs)
- **Official MCP Python SDK** (FastMCP Server)
- **SQLite & SQLAlchemy** (Data Persistence)
- **PyMuPDF & python-docx** (Document Parsing)
- **Plotly & NetworkX** (Analytics Charting)
- **Docker & Docker Compose** (Containerization)

---

## 📁 Repository Structure

```
my-mcp-server/
├── app.py                      # Streamlit navigation controller
├── requirements.txt            # Python system requirements
├── config.py                   # Environment loader
├── Dockerfile                  # Application build spec
├── docker-compose.yml          # Container configuration
├── database/                   # SQLAlchemy and SQLite layer
│   ├── db.py
│   ├── models.py
│   └── crud.py
├── agents/                     # LangGraph Agent logic
│   ├── planner.py
│   ├── evidence.py
│   ├── verification.py
│   ├── conflict.py
│   ├── risk.py
│   └── decision.py
├── backend/                    # FastAPI routes and services
│   ├── main.py
│   ├── middleware/
│   ├── routes/
│   └── services/
├── mcp/                        # FastMCP Server, tools, prompts, resources
│   ├── server.py
│   ├── tools.py
│   ├── resources.py
│   └── prompts.py
├── docs/                       # Complete project manuals
├── tests/                      # Automated test suite
└── uploads/                    # Local folder for document staging
```

---

## 🏁 Quick Start

### 1. Install dependencies
```bash
python -m pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in keys (optional LLM fallback triggers if blank).

### 3. Launch Backend
```bash
python -m uvicorn backend.main:app --reload --port 8000
```

### 4. Launch Streamlit
```bash
python -m streamlit run app.py --server.port 8501
```

### 5. Run Automated Tests
```bash
python -m pytest tests/test_verichain.py
```
---

## 📖 Complete Documentation

See detailed guides in the `docs/` folder:
- [Architecture & Diagrams](file:///D:/Hackathon/my-mcp-server/docs/architecture.md)
- [API Spec](file:///D:/Hackathon/my-mcp-server/docs/api_documentation.md)
- [Database Schema](file:///D:/Hackathon/my-mcp-server/docs/database_schema.md)
- [Installation Guide](file:///D:/Hackathon/my-mcp-server/docs/installation_guide.md)
- [Deployment Guide](file:///D:/Hackathon/my-mcp-server/docs/deployment_guide.md)
- [Hackathon Pitch & Slide Deck Strategy](file:///D:/Hackathon/my-mcp-server/docs/hackathon_pitch.md)
- [Demo Presentation Script](file:///D:/Hackathon/my-mcp-server/docs/presentation_script.md)
- [Future Scope & Roadmap](file:///D:/Hackathon/my-mcp-server/docs/future_scope.md)
