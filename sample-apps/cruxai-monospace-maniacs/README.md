# CruxAI — Autonomous Industrial Defect Detection & Multi-Agent Root Cause Analysis MCP Server

> Most defect detection tools stop at "crack detected." That's not useful on a factory floor.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen) ![Track](https://img.shields.io/badge/track-Manufacturing%20%26%20Industry%204.0-orange)

**Team:** Monospace Maniacs — SRMI  
**Track:** Manufacturing & Industry 4.0  
**Live MCP endpoint:** https://image-based-anomaly-detection-root-caus-monospace-maniac-srmist.app.nitrocloud.ai  
**GitHub repo:** https://github.com/Batchu-Jatadhar/Image-Based-Anomaly-Detection-Root-Cause-Agent

---

## Overview

Most defect detection tools stop at "crack detected." That's not useful on a factory floor. You still have to figure out *why* it cracked, what caused it, whether it's urgent, and what to do about it — and you're doing all of that manually.

CruxAI is our attempt to fix that.

You upload a photo of a component. The system finds the defect, draws a box around exactly where it is, generates a heatmap showing what the model was looking at, and then it actually tries to explain what went wrong. Not just a label — it pulls from a vector database of maintenance manuals and past failure records, reasons through the findings using a chain of AI agents, and gives you a root cause (e.g. *"material fatigue from uneven cooling during heat treatment"*) along with specific next steps.

Before any report goes to the engineer, a Verifier Agent checks every claim against the retrieved evidence. Nothing leaves the pipeline unaudited.

**The goal was simple: give the engineer the answer, not just the alert.**

---

## The Pipeline

```
Upload Image → Vision Engine (defect + bounding box + Grad-CAM heatmap)
     → Perception Agent (structures findings)
     → FAISS RAG Search (pulls historical cases & maintenance docs)
     → Diagnostic Agent (reasons root cause via LLM)
     → Verifier Agent (audits every claim for hallucinations)
     → Human-in-the-Loop (engineer approves → exports PDF/JSON)
```

---

## MCP Tools, Resources & Prompts

### Tools (6)
| Tool | Description |
|---|---|
| `inspect_industrial_image` | Runs the full end-to-end pipeline on an image |
| `retrieve_historical_guidelines` | Queries the FAISS vector store for similar cases |
| `verify_report_claims` | Audits any report against RAG evidence |
| `generate_inspection_pdf_report` | Compiles and exports a signed inspection report |
| `get_machine_health_history` | Returns 30-day line health and failure statistics |
| `get_supported_vision_categories` | Lists all supported defect taxonomies |

### Resources (4)
- `inspection://system_status` — model readiness and GPU availability
- `inspection://inspection_template` — ISO-9001 report JSON schema
- `inspection://faiss_index_metadata` — vector store config (384-dim, 1420 chunks)
- `inspection://model_evaluation_metrics` — live benchmark scores

### Prompts (3)
- `inspect_component_help` — guides operators through parameter setup
- `root_cause_investigation_guide` — walks through the full reasoning chain
- `preventive_maintenance_recommendation` — generates targeted maintenance protocols

---

## Connect to this MCP Server

```json
{
  "mcpServers": {
    "cruxai": {
      "url": "https://image-based-anomaly-detection-root-caus-monospace-maniac-srmist.app.nitrocloud.ai"
    }
  }
}
```

---

## Running Locally

```bash
git clone https://github.com/Batchu-Jatadhar/Image-Based-Anomaly-Detection-Root-Cause-Agent.git
cd Image-Based-Anomaly-Detection-Root-Cause-Agent
cp .env.example .env        # add your LLM API key

# Backend
pip install -r requirements.txt
python -m uvicorn server_api:app --host 0.0.0.0 --port 8000

# React dashboard
cd app && npm install && npm run dev   # → http://localhost:5173

# MCP server
cd server && npm install && npm run build && npm start
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Dashboard | React 19, Vite 8, Tailwind CSS 4 |
| Backend API | FastAPI, Python 3.10+ |
| MCP Server | NitroStack (TypeScript) |
| Vision Models | PyTorch, ResNet50, ViT |
| Heatmaps | Grad-CAM via OpenCV |
| RAG | FAISS + sentence-transformers (all-MiniLM-L6-v2) |
| Hallucination Audit | DeepEval HallucinationMetric |

---

Built with ❤️ by **Monospace Maniacs — SRMI** on [Nitrostack](https://nitrostack.ai).
