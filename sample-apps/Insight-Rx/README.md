# 🫁 Autonomous Medical Imaging Diagnosis & Clinical Decision Agent

> A local-first, multi-agent AI co-pilot for chest radiograph triage — vision-model perception, evidence-grounded reporting via RAG, a deterministic safety firewall, and mandatory human sign-off, orchestrated end-to-end with LangGraph and served through a FastAPI console.

[![Python](https://img.shields.io/badge/python-3.11+-blue)](https://python.org)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.2+-orange)](https://github.com/langchain-ai/langgraph)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green)](https://fastapi.tiangolo.com)
[![Status](https://img.shields.io/badge/status-pre--clinical%20%2F%20research-red)](#development--validation-status)
[![Offline](https://img.shields.io/badge/execution-100%25%20local-brightgreen)](#tech-stack)
[![License](https://img.shields.io/badge/license-unspecified-lightgrey)](#license)

---

## 🚀 Running This Project (TL;DR)

For anyone who clones this repo and just wants it running:

```bash
git clone https://github.com/SouryaneelPal/Autonomous-Medical-Imaging-Diagnosis-Clinical-Decision-Agent.git
cd Autonomous-Medical-Imaging-Diagnosis-Clinical-Decision-Agent/medagent

python3.11 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e . -r requirements.txt
python3 -m spacy download en_core_web_lg

cp .env.example .env        # then set FAISS_SIGNING_KEY and confirm OLLAMA_* values

ollama pull llama3.1:8b     # requires Ollama installed: https://ollama.com

python -m medagent.scripts.ingest_guidelines
./scripts/build_faiss_index.sh

uvicorn medagent.api.server:app --reload
```

Then open **http://127.0.0.1:8000** — FastAPI serves the console directly, no separate frontend process needed.

This is the minimum path to a running instance. PACS/MCP integration and real RSNA dataset ingestion are optional and covered in full, with prerequisites and explanations, in the [Quick Start](#quick-start) section below.

---

## ⚠️ Development & Validation Status

**Read this before anything else in this document.**

- This is a **research prototype**, not a deployed clinical product. It has **never been validated on real patient data**. Every quantitative result produced anywhere in this repository to date (Model Card figures, metric outputs, evaluation runs) was computed against **synthetic data** from `data/synthetic_rsna_generator.py`, and is explicitly watermarked `SYNTHETIC — NOT CLINICAL EVIDENCE` by `evaluation/model_card.py`.
- No component has received **FDA clearance, CE marking, or any other regulatory approval**. `docs/regulatory/` contains draft engineering documents prepared *for* future regulatory counsel review — they are not submissions, and are not legal advice.
- The **lesion-detector head has no trained checkpoint** and is randomly initialized until fine-tuning happens (`vision/models/detector.py`); the perception layer detects and reports this itself (see [Safety, Privacy & Regulatory Posture](#safety-privacy--regulatory-posture)) rather than silently producing misleading numbers.
- The **PACS integration is a fixture/simulated server**, clearly marked `simulated:true` end-to-end from the MCP payload through to the console UI. It is not connected to a real hospital PACS.
- The pipeline for ingesting the **real RSNA Pneumonia Detection Challenge dataset now exists and is tested** (`scripts/ingest_real_rsna.py`), but as of the current commit history, the real dataset has not yet been downloaded and no model has been trained on it.

Nothing below should be read as a clinical performance claim. It describes what has been *built and tested*, not what has been *clinically validated*.

---

## 📋 Table of Contents

- [Running This Project (TL;DR)](#-running-this-project-tldr)
- [Overview](#overview)
- [Architecture](#architecture)
- [Agent Pipeline](#agent-pipeline)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [PACS / MCP Integration](#pacs--mcp-integration)
- [Safety, Privacy & Regulatory Posture](#safety-privacy--regulatory-posture)
- [Evaluation Framework](#evaluation-framework)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Project Structure](#project-structure)
- [License](#license)

---

## Overview

This system takes a chest radiograph plus patient metadata (age, sex, view position), runs it through a local vision model and a chain of LLM agents, and produces a structured, evidence-cited diagnostic report — with a licensed clinician reviewing and approving every single case before it is finalized. No report is created, edited, or finalized without going through the console's RBAC-gated review step.

### What makes this different from a single-model wrapper

- **Multi-agent, not single-pass** — dedicated Diagnosis, Evidence, Report, and Verifier agents, orchestrated as a LangGraph state machine with retry logic, not one prompt doing everything.
- **Deterministic safety firewall before any LLM self-grading** — the Verifier Agent runs pure-code checks (schema validity, box/region consistency, citation grounding against real retrieved evidence) *before* an LLM semantic review, so the system isn't just asking an LLM to grade its own homework.
- **Mandatory human-in-the-loop** — every case pauses at a `graph.interrupt()` checkpoint; only an authenticated `radiologist` role can approve or revise a diagnosis, persisted via SQLite checkpointing so a case can sit waiting for hours without losing state.
- **100% local execution** — vision model, LLM agents (via Ollama), and the FAISS retrieval index all run on local hardware; `OFFLINE_MODE=true` is the default.
- **PHI de-identification as a hard gate** — DICOM metadata scrubbing, burned-in pixel-text redaction (OCR), and free-text PHI redaction (Presidio) all run *before* any downstream processing; if de-identification can't be verified, the case does not proceed.
- **Cryptographically signed knowledge base** — the FAISS guideline index is HMAC-signed; a tampered or drifted index fails closed with a `503`, not a silent bad answer.
- **Tamper-evident audit trail** — every pipeline action is written to a hash-chained audit log, verifiable end-to-end from the console's audit viewer.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                  React/HTML Console (ui/index.html)                  │
│   Case upload · Grad-CAM + bounding-box viewer · Report review       │
│   Prior-studies panel · Audit trail viewer · Sign-in gate            │
└────────────────────────────────┬─────────────────────────────────────┘
                                  │  same-origin, no CORS
┌────────────────────────────────▼─────────────────────────────────────┐
│              FastAPI Server (medagent.api.server:app)                │
│   /api/cases · /api/cases/{id}/review · /api/audit · /api/auth/*     │
│   Errors mapped by meaning: 403 (RBAC) · 422 (PHI/validation)        │
│   503 (untrusted retrieval index) — never collapsed into a bare 500  │
└────────────────────────────────┬─────────────────────────────────────┘
                                  │
┌────────────────────────────────▼─────────────────────────────────────┐
│                 LangGraph Orchestrator (StateGraph)                  │
│                                                                        │
│  PHI De-identification  ──▶  Perception (vision model)                │
│  (hard gate — halts on                Classification + bounding      │
│   failure, DICOM/OCR/text)             boxes + Grad-CAM heatmap       │
│         │                                      │                     │
│         ▼                                      ▼                     │
│  Diagnosis Agent (LLM)  ──▶  Evidence Agent  ──▶  PACS Retrieval      │
│  structured finding          FAISS RAG over        MCP node — prior  │
│  + calibrated confidence     ATS/IDSA + Semantic    studies, degrades │
│                               Scholar                 gracefully      │
│                                      │                                │
│                                      ▼                                │
│                              Report Agent (LLM)                       │
│                              drafts cited report                      │
│                                      │                                │
│                                      ▼                                │
│                        Verifier Agent — 3-stage firewall              │
│                  1. Abstention gate (low calibrated confidence)       │
│                  2. Deterministic checks (schema, box/region,         │
│                     citation grounding, external-hardware caution)    │
│                  3. LLM semantic review                               │
│                  ── fixable defect ──▶ back to Report Agent (≤3x) ──  │
│                                      │                                │
│                                      ▼                                │
│                    Human Review — graph.interrupt()                  │
│              RBAC-gated: radiologist approves/revises,                │
│              admin may reject only — MANDATORY, no bypass             │
│                                      │                                │
│                                      ▼                                │
│              Finalize + hash-chained Audit Record                     │
└────────────────────────────────┬──────────────────────────────────────┘
                                  │
┌────────────────────────────────▼─────────────────────────────────────┐
│                              Data Layer                              │
│  Signed FAISS index (guidelines) · SQLite (LangGraph checkpoints)    │
│  Hash-chained audit log · Locked RSNA train/val/test split           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Agent Pipeline

### Perception — Vision Model

Classifies the de-identified radiograph (`Normal` / `Lung Opacity` / `Other Abnormality`), localizes findings with bounding boxes, and generates a Grad-CAM activation heatmap.

- **Classifier backbone:** `torchxrayvision` DenseNet-121, pretrained on real chest X-ray corpora (not generic ImageNet weights) — configured via `VISION_WEIGHTS_ID`.
- **Detector:** Faster R-CNN (ResNet-50-FPN). **No trained checkpoint exists yet** — the box head is randomly initialized. `run_perception()` returns `None` (not a vacuous `0.0`) for alignment scoring when there is nothing meaningful to align against, and a `model_provenance()` flag surfaces this to the console rather than presenting an untrained model's output as measured performance.
- **Explainability:** Grad-CAM heatmap plus a mass-fraction alignment score between heatmap density and detected boxes.

### Diagnosis Agent

Turns the vision model's raw output into a structured clinical finding (finding, region, severity, reasoning) via a local LLM, with a calibrated confidence score attached.

### Evidence Agent

Retrieves the top matching ATS/IDSA guideline passages (and, optionally, Semantic Scholar literature) from a signed local FAISS index, so the eventual report is grounded in real, retrievable source text rather than the LLM's unaided recall.

### PACS Retrieval (Phase 3)

Queries a prior-imaging archive over MCP for the same patient before the report is drafted. Currently backed by a **fixture/simulated PACS server** (see [PACS / MCP Integration](#pacs--mcp-integration)) — an unreachable archive degrades to `prior_studies=None` and the case proceeds; it never halts the pipeline.

### Report Agent

Synthesizes the diagnosis, retrieved evidence, and any prior-study context into a structured draft report with inline citations back to the retrieved guideline text.

### Verifier Agent — three-stage firewall

1. **Abstention gate** — a case below the calibrated confidence threshold is routed straight to human review; no amount of report-writing can compensate for a vision model that wasn't confident in the first place.
2. **Deterministic checks** (pure code, no LLM) — schema validity, region/box-to-report consistency (negation-aware, so "no consolidation" isn't misread as a positive finding), and **citation grounding**: every citation in the report must correspond to a real retrieved snippet, or it's treated as the most severe class of defect. Also flags known false-positive sources — external hardware (ECG leads, pacemakers, lines, clips) that can project as dense opacity — as an advisory caution, not an auto-rejection.
3. **LLM semantic review** — only reached once 1 and 2 pass; catches subtler contradictions.

A fixable defect routes back to the Report Agent (bounded at 3 total attempts); anything else escalates directly to a human.

### Human Review — mandatory RBAC gate

`graph.interrupt()` pauses the graph and persists full state to SQLite. Only a `radiologist`-role session may approve or revise a diagnosis; an `admin` session may reject (route to manual workup) but not approve — modeling the real-world distinction between system administration and clinical sign-off authority.

---

## Tech Stack

### Computer Vision

| Component | Library |
|---|---|
| Vision framework | PyTorch, MONAI |
| Domain-pretrained backbone | torchxrayvision |
| Detection | torchvision (Faster R-CNN) |
| Explainability | grad-cam (pytorch-grad-cam) |
| DICOM / imaging I/O | pydicom, SimpleITK, nibabel, OpenCV |
| Augmentation | albumentations |

### LLM, Agents & Orchestration

| Component | Library |
|---|---|
| Orchestration | LangGraph (+ `langgraph-checkpoint-sqlite` for HITL persistence) |
| Agent/LLM glue | LangChain, langchain-ollama, langchain-huggingface |
| Local LLM runtime | Ollama (default model: `llama3.1:8b`, per-agent overrides supported) |
| Quantization | bitsandbytes (4-bit / NF4) |

### RAG & Knowledge

| Component | Library |
|---|---|
| Vector store | FAISS (HMAC-signed on disk) |
| Embeddings | sentence-transformers |
| Guideline ingestion | pypdf (`scripts/ingest_guidelines.py`) |
| Literature retrieval | Semantic Scholar API |

### Privacy / PHI De-identification

| Component | Library |
|---|---|
| Free-text PHI detection | Presidio (analyzer + anonymizer) |
| Burned-in pixel text | EasyOCR |
| DICOM tag scrubbing | Custom, HIPAA Safe Harbor-aware |

### API / Frontend

| Component | Library |
|---|---|
| Backend | FastAPI + Uvicorn |
| Console | React (in `ui/index.html`), served same-origin by FastAPI |
| PACS interoperability | NitroStack MCP server (TypeScript) + Python MCP client over stdio |

### Evaluation, Logging & Tracking

| Component | Library |
|---|---|
| Experiment tracking | MLflow |
| Agent/report quality eval | DeepEval |
| Calibration | netcal, custom ECE implementation |
| Observability (optional) | Arize Phoenix |

---

## Features

- **Multi-modal ingestion** — chest radiograph + patient metadata (age, sex, view position)
- **DICOM de-identification** — metadata scrubbing, burned-in text OCR redaction, free-text PHI redaction, all as a hard pre-processing gate
- **Dual explainability** — bounding-box lesion localization *and* Grad-CAM heatmaps
- **Evidence-grounded reporting** — every citation traceable to a real, signed, retrieved guideline passage
- **Prior-study awareness** — PACS lookup via MCP feeds prior imaging context into report drafting (currently fixture-backed)
- **Calibrated confidence** — Expected Calibration Error (ECE)-based calibration, not raw softmax confidence
- **Deterministic + LLM verification firewall** — see [Agent Pipeline](#agent-pipeline)
- **RBAC-gated human review** — mandatory, role-checked, no bypass path
- **Hash-chained audit log** — every pipeline action recorded and independently verifiable for integrity
- **Signed retrieval index** — a tampered or mismatched FAISS index fails closed (`503`), not silently
- **Bias/fairness auditing** — `evaluation/stratified.py` checks sensitivity confidence intervals per demographic subgroup, not just an aggregate score
- **Full MLOps** — MLflow experiment tracking, DeepEval report-quality regression testing, watermarked model cards

---

## Quick Start

> Just want the run commands? See [Running This Project (TL;DR)](#-running-this-project-tldr) above. The steps below cover the same ground with full explanations, plus the optional PACS/MCP and real-dataset steps.

### Prerequisites

- Python 3.11+
- [Ollama](https://ollama.com), with a model pulled: `ollama pull llama3.1:8b`
- (Optional, for real dataset ingestion) A [Kaggle](https://www.kaggle.com) account with the RSNA Pneumonia Detection Challenge rules accepted, and `~/.kaggle/kaggle.json`
- (Optional, for the PACS integration) Node.js, for the `mcp_server/` NitroStack project

### 1. Clone and install

```bash
git clone https://github.com/SouryaneelPal/Autonomous-Medical-Imaging-Diagnosis-Clinical-Decision-Agent.git
cd Autonomous-Medical-Imaging-Diagnosis-Clinical-Decision-Agent/medagent

python3.11 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install torch/torchvision/torchaudio first, from the index matching your hardware, e.g.:
#   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
pip install -e . -r requirements.txt

# Presidio's NLP engine needs a spaCy model that isn't a pip dependency:
python3 -m spacy download en_core_web_lg
```

### 2. Configure environment

```bash
cp .env.example .env
```

`.env` is anchored to the repo root, not your shell's working directory. Key variables to set:

```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
FAISS_SIGNING_KEY=<generate-and-set-your-own-key>
```

### 3. Build the signed knowledge base

```bash
python -m medagent.scripts.ingest_guidelines   # PDFs in docs/guidelines/ -> vector store
./scripts/build_faiss_index.sh                 # build -> sign -> verify, one atomic step
```

### 4. Run

```bash
uvicorn medagent.api.server:app --reload
```

Open **http://127.0.0.1:8000** — the FastAPI app serves the console directly (no separate frontend process).

### 5. (Optional) Real RSNA dataset ingestion

```bash
python scripts/ingest_real_rsna.py
```

Downloads and verifies the RSNA Pneumonia Detection Challenge dataset via the Kaggle API and produces a locked, patient-level 70/15/15 split (sorted by `patientId`, `random_state=42`). This does not by itself train a model — see `vision/train.py` / `scripts/train_classifier.sh`.

### 6. (Optional) PACS / MCP server

```bash
cd mcp_server
npm install
npm run dev
```

Without this running, prior-studies lookups degrade gracefully (`prior_studies=None`) rather than failing the case.

---

## Configuration

All settings are environment variables loaded via `utils/settings.py`. Full reference (47 variables) in `.env.example`.

| Variable | Description | Default |
|---|---|---|
| `APP_ENV` | `development` \| `staging` \| `production` | `development` |
| `OFFLINE_MODE` | Disable any non-essential outbound calls | `true` |
| `DEVICE` | `auto` (cuda>mps>cpu) \| `cpu` \| `mps` \| `cuda` | `auto` |
| `LLM_BACKEND` | LLM provider selector | `ollama` |
| `OLLAMA_BASE_URL` | Ollama endpoint every agent's LLM call routes through | `http://localhost:11434` |
| `OLLAMA_MODEL` | Fallback model (per-agent model vars take precedence) | `llama3.1:8b` |
| `VISION_WEIGHTS_ID` | torchxrayvision weight set | `densenet121-res224-all` |
| `CLASSIFIER_CHECKPOINT_PATH` / `DETECTOR_CHECKPOINT_PATH` | Local model checkpoint paths | `./models/checkpoints/...` |
| `FAISS_SIGNING_KEY` | HMAC key signing the retrieval index | *(required — no default)* |
| `MCP_SERVER_DIR` / `MCP_SERVER_COMMAND` | PACS MCP server process configuration | — |
| `MLFLOW_TRACKING_URI` | MLflow tracking store | local `./mlruns` |
| `RANDOM_SEED` | Fixed seed for reproducible splits/runs | `42` |

---

## API Reference

Served by `medagent.api.server:app`. Interactive schema at **http://127.0.0.1:8000/docs**.

```
GET    /                              Console (React app)
GET    /api/health                    Liveness check
GET    /api/auth/permissions          Current session's permission matrix (RBAC)
GET    /api/cases                     List cases
POST   /api/cases                     Submit a new case (upload + run the full pipeline)
GET    /api/cases/{case_id}           Fetch a specific case
POST   /api/cases/{case_id}/review    Radiologist/admin review action (approve/revise/reject)
GET    /api/cases/{case_id}/assets/{kind}   De-identified image/heatmap assets
GET    /api/audit                     Audit trail, with chain-integrity verdict
```

**Error semantics are meaningful, not generic:** `403` = RBAC-refused action, `422` = rejected payload or halted PHI gate, `503` = untrusted/tampered retrieval index. Endpoint handlers are synchronous by design so FastAPI runs the (CPU-bound) pipeline in its threadpool rather than blocking the event loop.

---

## PACS / MCP Integration

A [NitroStack](https://nitrostack.ai)-based MCP server (`mcp_server/`) exposes a single tool, `query_prior_studies`, over stdio. The Python side (`integration/mcp_client.py`) spawns it as a child process per call — there's no long-lived port or shared state, which is a deliberate trade favoring isolation over latency for a lookup that's normally sub-second.

- **Degrades, never halts.** An unreachable server leaves `prior_studies=None`; the case proceeds without prior-imaging context.
- **`None` and `[]` are kept distinct.** "The archive was unreachable" and "this patient genuinely has no prior studies" are different clinical facts, and the console shows which one occurred.
- **Simulated data is marked, end to end.** Every fixture study carries `simulated:true` and a `dataSource` banner from the MCP payload itself (not a UI-side constant) — so the marker disappears on its own once a real PACS is wired in, rather than requiring someone to remember to remove it. The report-drafting prompt carries the same marker and is instructed not to make comparative claims (e.g. "unchanged from prior") off fixture data.

---

## Safety, Privacy & Regulatory Posture

**These are engineering controls that exist in the codebase today — not regulatory certifications.** No formal GDPR, HIPAA, or EU AI Act compliance determination has been made for this system; that requires organizational and legal processes this repository does not perform on its own. What *is* implemented:

| Concern | Implementation |
|---|---|
| PHI minimization | DICOM tag scrubbing + burned-in pixel-text OCR redaction + free-text PHI redaction (Presidio), enforced as a hard pre-processing gate |
| Human accountability | Mandatory RBAC-gated review; no diagnosis is finalized without an authenticated `radiologist` action |
| Audit / record-keeping | Hash-chained audit log, independently verifiable for tamper-evidence via the console's audit viewer |
| Transparency | Grad-CAM heatmaps + bounding boxes + calibrated confidence shown alongside every finding |
| Data/model integrity | HMAC-signed FAISS index; boot-time preflight check fails closed on a signing-key mismatch rather than serving from a possibly-tampered index |
| Regulatory pathway planning | `docs/regulatory/fda_ce_pathway.md`, `docs/regulatory/intended_use.md` — engineering drafts prepared for future counsel review, explicitly marked as such |

> The audit hash chain is tamper-**evident**, not tamper-**proof** — someone with full write access to the log file could in principle regenerate a self-consistent fake chain. This is a known, documented limitation pending an external signature anchor.

---

## Evaluation Framework

- **Classification:** Accuracy, Precision, Recall, F1 — recall is explicitly prioritized over precision to minimize missed pneumonia cases.
- **Localization:** IoU (Intersection over Union) between predicted and ground-truth boxes.
- **Calibration:** Expected Calibration Error (ECE), with temperature-scaling based calibration.
- **Report quality:** DeepEval — Faithfulness and Contextual Relevancy (built-in), plus custom `ClinicalSeverityConsistency` and `SafeHedging` metrics mirroring the Verifier Agent's own checks.
- **Fairness:** `evaluation/stratified.py` computes per-demographic-subgroup sensitivity confidence intervals against a patient-safety floor, not just an aggregate metric.
- **Reproducibility:** locked 70/15/15 train/val/test split, sorted by `patientId`, `random_state=42` (`evaluation/dataset_split.py`).
- **Provenance:** `evaluation/model_card.py` detects (rather than assumes) whether results came from real or synthetic data, and watermarks accordingly.

All numbers produced by this framework to date are against **synthetic** data — see [Development & Validation Status](#development--validation-status).

---

## Testing

Unit and integration tests cover privacy/de-identification, security (auth, audit chain, artifact signing), the verifier firewall, RBAC gating, dataset splitting, calibration/metrics, and the API layer. Per the project's own commit history, the suite currently stands at several hundred tests, reported passing as of the latest commit.

```bash
pytest
```

---

## Roadmap

Phases follow the project's own internal engineering-phase numbering.

**Phase 1 — Core pipeline:** Perception, Diagnosis/Evidence/Report agents, LangGraph orchestration. ✅

**Phase 2 — Safety, privacy & compliance architecture:** PHI de-identification, RBAC, hash-chained audit log, signed FAISS index, verifier firewall, bias/fairness auditing, regulatory-draft documentation. ✅

**Phase 2.5 — End-to-end wiring:** FastAPI layer connecting the console to the real pipeline, removal of hardcoded mock UI data, real RSNA ingestion script, retrieval-integrity preflight, honest (rather than vacuous) perception-confidence reporting. ✅

**Phase 3 — Interoperability (in progress):**
- [x] PACS lookup via a NitroStack MCP server (fixture-backed)
- [ ] Connection to a real hospital PACS / DICOM node
- [ ] HL7/FHIR structured export

**Not yet started:**
- [ ] Training a real classifier/detector checkpoint on the actual RSNA dataset
- [ ] Any real-patient-data validation
- [ ] FDA/CE regulatory submission (currently draft documentation only)
- [ ] CI pipeline execution (`.github/workflows/ci.yml` exists but is currently empty)
- [ ] Containerized deployment (`Dockerfile` / `docker-compose.yml` are currently empty)

---

## Project Structure

```
medagent/
├── src/medagent/
│   ├── agents/            # orchestrator, state schema, diagnosis/evidence/report/verifier agents
│   ├── api/                # FastAPI server, request/response schemas
│   ├── integration/        # MCP client for the PACS server
│   ├── vision/              # classifier, detector, Grad-CAM, preprocessing, training
│   ├── rag/                 # FAISS vectorstore, retriever, guideline + Semantic Scholar ingestion
│   ├── privacy/             # DICOM scrubbing, OCR redaction, PHI de-identification
│   ├── security/            # auth/RBAC, hash-chained audit log, artifact signing
│   ├── evaluation/          # metrics, calibration, dataset split, model card, fairness auditing
│   ├── llm/                  # local LLM loader (Ollama)
│   └── ui/                  # React console (index.html)
├── mcp_server/               # NitroStack MCP server exposing PACS tools
├── scripts/                  # dataset/guideline ingestion, FAISS build+sign, training
├── configs/                  # agent/model/RAG/logging YAML configs
├── docs/
│   ├── guidelines/           # source PDFs (ATS/IDSA, ACR) indexed into the RAG store
│   └── regulatory/           # draft intended-use + FDA/CE pathway documents
├── tests/                    # unit + integration suite
├── .env.example
├── requirements.txt
└── pyproject.toml
```

---

*Research prototype for a clinical decision-support co-pilot. Not a medical device. Every output requires review and sign-off by a licensed clinician before any clinical use, and no component has been validated on real patient data or cleared by any regulatory body.*
