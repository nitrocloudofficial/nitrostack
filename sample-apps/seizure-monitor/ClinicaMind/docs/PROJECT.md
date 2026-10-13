# PROJECT.md

# Executive Summary & Project Specification

**ClinicaMind** is a 24-hour hackathon prototype: a multi-agent clinical decision-support workspace that listens during doctor-patient consultations and autonomously orchestrates healthcare data (history, medications, research, etc.) into an evidence-backed briefing.

## Project Brief (≤300 words)

ClinicaMind is an **AI Clinical Decision Support system**. Its mission is to be a “virtual care coordinator” during patient consultations. As the doctor and patient speak, multiple AI agents work behind the scenes:
- A **Supervisor Agent** monitors the conversation context.
- A **History Agent** retrieves prior health records.
- A **Medication Agent** checks current prescriptions for interactions and allergies.
- A **Research Agent** searches the latest medical literature (via PubMed E-utilities).
- A **Gap Analysis Agent** identifies missing information (e.g., smoking history, recent travel).

The agents collaborate (triggering each other via NitroStack MCP tools) to produce a **Clinical Briefing** with possible diagnoses, evidence snippets, and safety warnings. The frontend is an interactive **node-canvas UI** (built with React Flow) that visualizes each agent's output as draggable boxes and arrows. All data flows through NitroStack MCP modules, keeping the frontend as a thin client.

This coordinated, multi-step approach moves “beyond chatbots” to real-time decision support. In practice, a doctor might ask a patient about chest pain and **without any UI buttons**, ClinicaMind dynamically shows symptom nodes, risk scores, and treatment alerts. The project uses public APIs (PubMed E-utilities, openFDA drug-labeling) and mock data. Documentation includes CLI setup (NitroStack v3, `nitrostack-cli`), testing scripts, and a 3-minute demo script. In summary, ClinicaMind is an end-to-end agentic system that **proactively coordinates patient care** without replacing the physician’s judgment.

---

## Core Problem Statement

Healthcare delivery suffers from data fragmentation and clinician cognitive overload:
1. **Siloed Data**: Patient history, active drug lists, lab results, and guidelines exist across disparate systems.
2. **Cognitive Burden**: Physicians must manually search medical literature and cross-reference interactions while conversing with the patient.
3. **Information Gaps**: Crucial risk factors or diagnostic questions are frequently missed during high-pressure consultations.

## Solution & Key Innovations

ClinicaMind solves these challenges through proactive multi-agent orchestration:
- **Zero-Click Workflow**: Operates passively in the background by transcribing conversation audio and inferring clinical intent.
- **Multi-Agent Orchestration**: Specialized micro-agents execute concurrently and sequentially via NitroStack MCP tools.
- **Node-Canvas Visualization**: Replaces linear chat windows with a transparent visual map of clinical reasoning, risk nodes, and literature references.
- **Evidence-Backed Decision Support**: Directly links recommended interventions to published PubMed literature and openFDA drug label warnings.

---

## Hackathon Reference Tables

### Team Roles & Responsibilities

| Team Member | Role | Primary Responsibilities |
| :--- | :--- | :--- |
| **Alice** | Frontend Developer | Node Canvas UI (React Flow), custom node components, animations, accessibility |
| **Bob** | Backend Developer | NitroStack server setup, MCP tool definitions, TypeScript schemas |
| **Carol** | AI Engineer | LLM prompt engineering, agent orchestration, PubMed/openFDA API integrations |
| **Dave** | DevOps & QA | CLI scripts, Docker deployment, unit & integration test suite |

### 24-Hour Hackathon Timeline

| Timeline (Hours) | Core Milestone / Tasks |
| :--- | :--- |
| **0 – 1** | Architecture design, documentation finalizing (`/docs/*.md`), environment setup |
| **1 – 5** | Implement NitroStack MCP modules & tools (`History`, `Medication`, `Research`, `GapAnalysis`) |
| **5 – 8** | Build custom React Flow canvas components and node styling |
| **8 – 12** | Wire frontend canvas to backend NitroStack server via streaming/WebSocket events |
| **12 – 15** | Implement and verify test cases for all 3 demo scenarios |
| **15 – 17** | Slide deck preparation, demo recording backup, narrative rehearsal |
| **17 – 18** | Final polish, dry run, and submission |

### Demo Test Cases Overview

| Scenario | Patient Profile | Input Context / Symptoms | Agents Triggered | Primary Outcome / Alert |
| :--- | :--- | :--- | :--- | :--- |
| **1. Mild Cold** | Age 25, no history | Runny nose, mild headache | History, Research | Routine symptomatic care advice; low risk flagged |
| **2. Drug Interaction** | Age 60, on Warfarin | Leg pain, starts Ibuprofen | History, Medication | **High-Severity Alert**: Warfarin + Ibuprofen bleeding risk |
| **3. Pneumonia & Allergy** | Age 70, Diabetic | Chest pain, cough, Penicillin allergy | All Agents | **Urgent Alert**: Pneumonia evaluation, Penicillin allergy flag, PubMed research summary |
