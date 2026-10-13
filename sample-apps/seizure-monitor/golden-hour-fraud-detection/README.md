# Golden Hour - Imposture Detection with MCP

> Golden Hour is an AI-powered, MCP-enabled cyber fraud response platform that transforms fraud complaints into investigation-ready case packets through a deterministic, one-in-a-million 3-agent intelligence swarm.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen)

**Golden Hour - Imposture Detection with MCP** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with new, real-world capabilities. It is built and deployed on [Nitrostack](https://nitrostack.ai), the fastest way to build, deploy, and share MCP apps.

## Table of Contents

- [Overview](#overview)
- [Why This Project is Elite](#why-this-project-is-elite)
- [System Architecture Flowchart](#system-architecture-flowchart)
- [What is MCP?](#what-is-mcp)
- [Features](#features)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

## Overview

Golden Hour is an AI-powered, MCP-enabled cyber fraud response platform that transforms fraud complaints into investigation-ready case packets through a deterministic three-agent workflow. It automatically classifies fraud, assigns cases to the appropriate authorities, and provides jurisdiction-specific legal guidance with explainable recommendations. By combining specialized AI agents, Model Context Protocol (MCP), and human-in-the-loop decision making, Golden Hour enables faster, transparent, and more reliable cyber fraud investigations while ensuring all final enforcement decisions remain with authorized personnel.

## 🌟 Why This Project is Elite

1. **Deterministic Orchestration:** We don't leave control flow to chance. Our backend dictates the absolute path of execution, while isolated AI agents handle the deeply complex cognitive work (classification, legal mapping, personnel assignment).
2. **Neon Serverless PostgreSQL:** Lightning-fast, infinitely scalable, serverless data access. By leveraging **Neon**, this pipeline handles massive data concurrency without breaking a sweat, ensuring instant recovery and global scale.
3. **Self-Updating API Keys:** Security isn't an afterthought. Our system architecture embraces **self-updating API keys**, drastically reducing the attack surface and ensuring high-availability operations never fail due to stale credentials.
4. **Agent Isolation:** Zero cross-contamination. Agents operate in strict information silos, receiving only the precise, validated JSON output they need. This maximizes context window efficiency and eliminates hallucination bleed.

## 🧠 System Architecture Flowchart

```mermaid
flowchart TD

    %% Node Definitions & Shapes
    START(["Start: Fraud Report Submitted"])
    EXT_SUB["External Ticket Submission (Victim, Fraud Details, Fraudster Info, Region, Attachments)"]
    
    subgraph ORCH_CONTAINER["MCP Server Runtime"]
        MCP_SERVER["MCP Server: fraud-pipeline-mcp"]
        ORCH["Orchestrator: run_fraud_pipeline"]
        VAL_TICKET["Validate Input Ticket (Zod TicketSchema)"]
    end

    %% Databases / Storage
    MOCK_DB[("Mock Tickets Database (Shared UPI: fraudster@paytm)")]
    PG_DB[("Neon Serverless PostgreSQL")]

    %% Agent 1 Subgraph
    subgraph AGENT1_SG["Agent 1: Triage & Classification (Deterministic Logic)"]
        A1_FETCH["Fetch Ticket: get_ticket"]
        A1_RELATED["Fetch Related Tickets: get_related_tickets (UPI, Bank, Phone, IFSC)"]
        A1_CLASSIFY["Classify Fraud Type (UPI, Card, Cheque, Phishing, etc.)"]
        A1_SCALE["Estimate Scale (Victim count, Pattern suspected)"]
        A1_URGENCY["Calculate Urgency (Low / Medium / High / Critical)"]
        A1_RISK["Calculate Risk Score (0 - 100)"]
        A1_GAPS["Identify Evidence Gaps"]
        
        A1_FETCH --> A1_RELATED --> A1_CLASSIFY --> A1_SCALE --> A1_URGENCY --> A1_RISK --> A1_GAPS
    end

    %% Fan-Out / Merge Nodes
    FORK{"Parallel Execution (Fan-Out)"}
    JOIN{"Merge Agent Outputs (Fan-In)"}

    %% Agent 2 Subgraph
    subgraph AGENT2_SG["Agent 2: Assignment & Routing"]
        A2_DEPT["Get Dept Directory: get_department_directory (Match Jurisdiction + Specialization)"]
        A2_CAPACITY["Select Best Dept (Capacity Ratio: Caseload / Capacity)"]
        A2_AVAIL["Get Personnel Availability: get_personnel_availability"]
        A2_PERSONNEL["Select Available Personnel (Filter Status, Slice Team Size)"]
        A2_TEAM["Decide Team Size (Individual | Small Team | Full Team)"]
        A2_ESCALATE["Set Escalation Flag (True if Critical, Pattern, or Risk >= 80)"]
        A2_OUT["Output: Agent2AssignmentOutput"]

        A2_DEPT --> A2_CAPACITY --> A2_AVAIL --> A2_PERSONNEL --> A2_TEAM --> A2_ESCALATE --> A2_OUT
    end

    %% Agent 3 Subgraph
    subgraph AGENT3_SG["Agent 3: Legal & Compliance"]
        A3_SEARCH["Search Legal Corpus: search_legal_corpus (5 Fallback Strategies)"]
        A3_MAP["Map Applicable Laws (Name, Section, Summary, Citation)"]
        A3_ACTIONS["Build Suggested Actions (Action, Legal Basis, Urgency)"]
        A3_OUT["Output: Agent3LegalOutput"]

        A3_SEARCH --> A3_MAP --> A3_ACTIONS --> A3_OUT
    end

    %% Output & Storage / Dashboard
    BUILD_PACKET["Build Master Case Packet (Combines Ticket + Triage + Assignment + Legal)"]
    DASHBOARD["Dashboard Summary (Title, Priority, Dept, Personnel Count, Legal Citations, Escalation Flag, Statutes)"]
    END_NODE(["END: Assigned Authority Dashboard (Human Enforces / Rejects / Modifies)"])

    %% Data Connections & Fallbacks
    FALLBACK_DEPT["Hardcoded Dept Directory (Fallback Data)"]
    FALLBACK_LEGAL["Hardcoded Legal Corpus (Fallback Data)"]
    DEGRADATION["Graceful Degradation (Return Empty Results on Error)"]

    %% Pipeline Connections
    START --> EXT_SUB --> MCP_SERVER --> ORCH --> VAL_TICKET --> AGENT1_SG
    
    %% Agent 1 DB Flow
    MOCK_DB -.-> A1_FETCH
    MOCK_DB -.-> A1_RELATED
    AGENT1_SG --> FORK
    FORK --> AGENT2_SG
    FORK --> AGENT3_SG

    %% Agent 2 DB & Fallback Flows
    PG_DB -.-> A2_DEPT
    PG_DB -.-> A2_AVAIL
    A2_DEPT -.->|DB Error| FALLBACK_DEPT
    A2_AVAIL -.->|DB Error| DEGRADATION

    %% Agent 3 DB & Fallback Flows
    PG_DB -.-> A3_SEARCH
    A3_SEARCH -.->|DB Error| FALLBACK_LEGAL

    %% Fan-In & Final Pipeline
    A2_OUT --> JOIN
    A3_OUT --> JOIN
    JOIN --> BUILD_PACKET --> DASHBOARD --> END_NODE

    %% Styling
    classDef orchClass fill:#6b21a8,stroke:#581c87,color:#ffffff,font-weight:bold;
    classDef agent1Class fill:#1e40af,stroke:#1e3a8a,color:#ffffff,font-weight:bold;
    classDef agent2Class fill:#15803d,stroke:#166534,color:#ffffff,font-weight:bold;
    classDef agent3Class fill:#c2410c,stroke:#9a3412,color:#ffffff,font-weight:bold;
    classDef dbClass fill:#4b5563,stroke:#374151,color:#ffffff,font-weight:bold;
    classDef fallbackClass fill:#991b1b,stroke:#7f1d1d,color:#ffffff,stroke-dasharray: 5 5;
    classDef startEndClass fill:#0f172a,stroke:#0284c7,color:#ffffff,font-weight:bold;

    class MCP_SERVER,ORCH,VAL_TICKET orchClass;
    class A1_FETCH,A1_RELATED,A1_CLASSIFY,A1_SCALE,A1_URGENCY,A1_RISK,A1_GAPS agent1Class;
    class A2_DEPT,A2_CAPACITY,A2_AVAIL,A2_PERSONNEL,A2_TEAM,A2_ESCALATE,A2_OUT agent2Class;
    class A3_SEARCH,A3_MAP,A3_ACTIONS,A3_OUT agent3Class;
    class MOCK_DB,PG_DB dbClass;
    class FALLBACK_DEPT,FALLBACK_LEGAL,DEGRADATION fallbackClass;
    class START,END_NODE startEndClass;
```

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

## Features

- 🔌 **MCP-native** — works with any MCP-compatible client (Claude, Cursor, and more)
- 🛠️ **Tools, resources & prompts** — exposes structured capabilities to AI agents
- ⚡ **Deployed on Nitrostack** — reliable, hosted, and instantly shareable
- 🔐 **Secure by design** — secrets stay in environment variables, never in code
- 🧩 **Composable** — combine with other MCP apps to build powerful AI workflows

## Getting Started

### Prerequisites

- Node.js 18+ (or your project runtime)
- Neon PostgreSQL connection string
- An MCP-compatible client (Claude Desktop, Cursor, etc.)

### Installation

```bash
git clone https://github.com/your-username/golden-hour-imposture-detection-with-mcp.git
cd golden-hour-imposture-detection-with-mcp
npm install
```

### Configuration

Copy the example environment file and add your highly secure environment variables, including your **Neon DATABASE_URL** and **Self-Updating API configurations**:

```bash
cp .env.example .env
```

### Run

```bash
npm run dev
```

## Connect to an MCP Client

Add this server to your MCP client configuration. A typical entry looks like:

```json
{
  "mcpServers": {
    "golden-hour-imposture-detection-with-mcp": {
      "command": "npm",
      "args": ["run", "dev"]
    }
  }
}
```

Restart your client and the tools from this MCP server will be available to your AI assistant.

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[Nitrostack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

👉 **Start building:** [https://nitrostack.ai](https://nitrostack.ai)

## Explore More MCP Apps

- 🌙 Discover and share MCP projects with the community on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- 🧰 Browse a growing catalog of MCP apps on [Nitrostack](https://nitrostack.ai/apps)

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

### What does Golden Hour - Imposture Detection with MCP do?

Golden Hour is an AI-powered, MCP-enabled cyber fraud response platform that transforms fraud complaints into investigation-ready case packets through a deterministic, one-in-a-million 3-agent intelligence swarm.

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop and Cursor. New clients are adding MCP support regularly.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

## Keywords

`BFSI & FinTech` · `Golden Hour - Imposture Detection with MCP` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `deploy MCP server` · `build MCP app`

## License

Private, Exclusive & Highly Confidential.
*(Operating under MIT for standard open-source framework integrations)*

---

Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).