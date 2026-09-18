# HealthSync AI

An AI-powered clinical intelligence platform built using the **Model Context Protocol (MCP)**. HealthSync AI demonstrates how multiple independent healthcare services can collaborate through MCP to retrieve patient records, process clinical documents, check medication interactions, search pharmacy inventory, and automate healthcare workflows.

---

## Overview

HealthSync AI replaces tightly coupled backend integrations with a modular MCP-based architecture. Each healthcare capability is implemented as an independent MCP server, allowing the backend orchestrator to dynamically discover and invoke tools through the official Model Context Protocol SDK.

---

## Features

- FHIR-based patient record retrieval
- Patient medical timeline generation
- Clinical document processing
- Drug interaction analysis using RxNav
- Pharmacy inventory lookup
- Nearby pharmacy search
- Slack notification integration
- Multi-MCP server orchestration
- Live Agent Activity workflow visualization
- Modular healthcare architecture using MCP

---

## Architecture

```
                    React Frontend
                           │
                           ▼
                  Express Backend API
                           │
                           ▼
                MCP Client / Orchestrator
                           │
     ┌──────────┬──────────┬──────────┬──────────┐
     ▼          ▼          ▼          ▼          ▼
FHIR MCP   Document MCP  RxNav MCP Pharmacy MCP Slack MCP
```

Each MCP server is independently deployed and communicates with the backend through the official Model Context Protocol using Stdio transport.

---

## MCP Servers

### FHIR MCP

Retrieves standardized patient information.

Available tools:

- searchPatients
- getPatient
- getConditions
- getMedications
- getAllergies
- getObservations
- getEncounters

---

### Document MCP

Processes uploaded medical documents.

Available tools:

- extractMedicalEvents

---

### RxNav MCP

Provides medication intelligence.

Available tools:

- checkDrugInteractions
- getGenericEquivalents

---

### Pharmacy MCP

Searches medicine availability and inventory.

Available tools:

- searchPharmacyInventory

---

### Slack MCP

Sends clinical workflow notifications.

Available tools:

- sendOrderNotification

---

## Workflow

```
Upload Prescription
        │
        ▼
Document MCP
        │
        ▼
FHIR MCP
        │
        ▼
RxNav MCP
        │
        ▼
Pharmacy MCP
        │
        ▼
Slack MCP
        │
        ▼
Clinical Recommendation
```

---

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Framer Motion

### Backend

- Node.js
- Express.js

### AI & Orchestration

- Model Context Protocol (MCP)
- @modelcontextprotocol/sdk

### Healthcare

- HL7 FHIR
- RxNav API

### Notifications

- Slack Webhooks

---

## Project Structure

```
healthsync-ai/

├── frontend/
├── backend/
├── agent/
└── mcp-servers/
    ├── fhir-mcp/
    ├── document-mcp/
    ├── rxnav-mcp/
    ├── pharmacy-mcp/
    └── slack-mcp/
```

---

## Running the Project

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Demo Flow

1. Upload a prescription or clinical document.
2. Extract medical information using the Document MCP.
3. Retrieve patient history through the FHIR MCP.
4. Check medication interactions using the RxNav MCP.
5. Search nearby pharmacies and medicine inventory.
6. Send reservation notifications using the Slack MCP.
7. Display the complete workflow through the Agent Activity panel.

---

## Why MCP?

Traditional healthcare applications directly integrate multiple APIs inside backend logic, making them difficult to maintain and extend.

HealthSync AI adopts the **Model Context Protocol (MCP)** to separate each healthcare capability into an independent service. This modular approach enables:

- Dynamic tool discovery
- Independent service development
- Better scalability
- Reusable healthcare components
- Cleaner system architecture

---

## Future Enhancements

- Hospital Discovery MCP
- Insurance Verification MCP
- Appointment Scheduling MCP
- Medical Imaging MCP
- Voice-enabled Clinical Assistant
- Multi-language Support

---

## Team

HackNova

Built for the NitroStack MCP Hackathon.
