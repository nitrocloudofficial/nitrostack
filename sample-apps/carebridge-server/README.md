# 🩺 CAREBRIDGE AI — Next-Gen Medical Care Navigation & Triage MCP Platform

> **Empowering patients with continuous health monitoring, deterministic medical triage, HL7 FHIR EHR integration, and MongoDB Atlas Vector Search — built on NitroStack MCP & Next.js Widgets.**

[![NitroStack](https://img.shields.io/badge/Built%20With-NitroStack%20MCP-blueviolet.svg)](https://nitrostack.ai)
[![MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB%20Atlas-green.svg)](https://www.mongodb.com/atlas)
[![VectorDB](https://img.shields.io/badge/AI-Vector%20Search%20RAG-orange.svg)](https://www.mongodb.com/products/platform/atlas-vector-search)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Widgets-Next.js%2014-black.svg)](https://nextjs.org/)
[![CI Status](https://github.com/nitrostackai/carebridge/workflows/CareBridge%20CI%20Pipeline/badge.svg)](https://github.com)

---

## 💡 The Problem & Opportunity

Modern healthcare suffers from a dangerous **context disconnect**:
- **Patients** ignore subtle, compounding vitals shifts (e.g., dropping sleep + rising heart rate) until symptoms become severe.
- **Emergency Rooms** are overwhelmed by non-emergency visits due to panic and a lack of reliable triage.
- **Clinicians** receive zero longitudinal context prior to a consultation, wasting precious appointment minutes reviewing past lab trajectories.

**CareBridge AI** bridges this gap. By combining continuous passive health monitoring, deterministic medical safety triage, MongoDB Atlas cloud persistence, and automated clinician brief generation into a unified **Model Context Protocol (MCP)** server, CareBridge delivers real-time, visual, and safe care navigation.

---

## ✨ Key Features & Multi-Agent Architecture

CareBridge AI operates as a coordinated multi-agent intelligence server:

| Agent / Module | Primary Capability | Visual Widget / Output |
| :--- | :--- | :--- |
| 🛡️ **Guardian AI** | Passive vitals monitoring & baseline shift detection (sleep, resting HR, activity, meals) | `dashboard` |
| 🩺 **Triage AI** | Safety-first deterministic red-flag screening + **MongoDB Vector Knowledge Search** | `triage-result` |
| 📊 **Health Intelligence** | Longitudinal lab trajectory analysis, HL7 FHIR Bundle Export, and DB seeding | `health-timeline` |
| 📋 **Doctor Brief** | Automated clinician handoff summary & recommended next actions | `doctor-brief` |
| 🧠 **CareBridge Pipeline** | Master orchestrator running the complete care navigation flow in one step | `carebridge-pipeline` |

---

## 🍃 MongoDB Atlas & Vector Search RAG Architecture

CareBridge AI integrates **MongoDB Atlas** for document persistence and **Atlas Vector Search** for semantic clinical RAG:

```mermaid
graph TD
    Client([MCP Client / Prompt]) --> MCPApp[CareBridge MCP Server]
    
    subgraph Core MCP Tools
        Pipeline[PipelineTools: orchestrate_carebridge]
        Triage[TriageTools: check_red_flags, search_clinical_knowledge]
        Guardian[GuardianTools: analyze_baseline]
        Health[HealthTools: export_fhir_bundle, seed_mongodb_database]
    end

    subgraph Data & Storage Layer
        PatientRepo[PatientRepository]
        MongoService[MongoService - MongoDB Driver]
    end

    subgraph MongoDB Atlas (Cloud Cluster0)
        ColPatients[(patients - FHIR JSON)]
        ColObs[(observations - LOINC Vitals & Labs)]
        ColGuidelines[(clinical_guidelines - Vector Embeddings)]
    end

    MCPApp --> Core MCP Tools
    Core MCP Tools --> PatientRepo
    PatientRepo --> MongoService
    MongoService --> ColPatients
    MongoService --> ColObs
    MongoService --> ColGuidelines
```

### 🧠 Semantic Vector Knowledge Retrieval (`search_clinical_knowledge`)
- Stores embedded medical guidelines and SNOMED-CT triage protocols in MongoDB Atlas.
- Enables semantic vector search over patient symptom reports (e.g., *"crushing chest pressure radiating to jaw"*) to retrieve evidence-backed clinical protocols.
- **Graceful Fallback**: If offline, automatically degrades to local high-performance FHIR repository without breaking.

---

## 🔒 Clinical AI Safety & Negation Context Engine

In healthcare AI, **hallucination prevention and safety are non-negotiable**:

1. **Deterministic Red-Flag Rules**: Emergency classification (`Emergency` 🚨, `Urgent` 🟠, `Routine evaluation` 🔵, `Monitor/self-care` 🟢) relies on strict medical rules that LLMs cannot override.
2. **Negation Context Parser**: Built-in NLP context analysis (`isKeywordTriggered`) parses negative qualifiers (e.g., *"feeling tired, but no chest pain and no fainting"*), preventing false-positive emergency alerts.
3. **HL7 FHIR Interoperability**: Implements FHIR R4 standard JSON bundles with official LOINC coding (`8867-4` Heart rate, `718-7` Hemoglobin, `9318-7` Sleep, `9383-2` Steps).

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher

### 1. Clone & Install
```bash
git clone https://github.com/your-org/carebridge.git
cd carebridge

# Install server and widget dependencies
npm run install:all
```

### 2. Development Mode
Run the NitroStack dev server with hot-reloading:
```bash
npm run dev
```

### 3. Run Integration Tests
Run the comprehensive test suite verifying MongoDB Atlas connectivity, Vector Search, and FHIR bundles:
```bash
npx tsx src/tests/integration.test.ts
```

### 4. Build & Production Start
```bash
npm run build
npm start
```

---

## 🐳 Docker Deployment

CareBridge AI includes a multi-stage production Docker container:

```bash
# Build Docker container
docker build -t carebridge-server .

# Run Docker container
docker run -p 3000:3000 carebridge-server
```

---

## 🛠️ Technology Stack

- **Framework**: [NitroStack Core](https://nitrostack.ai) (TypeScript NestJS-style MCP Architecture)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) (Cloud Document Store & Vector Search)
- **UI Widgets**: Next.js 14, React 18, `@nitrostack/widgets`
- **Validation**: Zod schema validation
- **Testing**: Native TypeScript integration test harness with `tsx`
- **DevOps**: Docker, GitHub Actions CI Pipeline

---

## 🏆 Hackathon Demo Flow (Judges Evaluation Guide)

Try prompting CareBridge AI with the demo scenario:

1. **Patient Input**: *"I've been feeling exhausted lately, sleeping poorly, but I don't have any chest pain."*
2. **Tool Execution**: `orchestrate_carebridge`
3. **What Happens**:
   - **MongoDB Atlas** dynamically retrieves patient records for `PAT-88421`.
   - **Guardian AI** flags a **-30% sleep drop** and **+17% HR increase**.
   - **Triage AI** recognizes the phrase *"no chest pain"* as **negated**, avoiding a false emergency alert.
   - **Vector Search** matches clinical guidelines for low Hemoglobin and progressive fatigue.
   - **Result**: Generates a **Routine Evaluation (48-72h)** recommendation and renders an interactive **Doctor Brief Widget** for handoff.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.
