# NitroStack Pizzaz Template

Template focused on rich, interactive widget experiences (map/list/detail flows)
using the NitroStack widget SDK patterns.

## What This Template Includes

- Widget-heavy module and UI structure
- Interactive examples for advanced frontends
- Optional map provider integration pattern
- Studio-friendly development workflow

## Quick Start

```bash
npx @nitrostack/cli init my-pizzaz-app --template typescript-pizzaz
cd my-pizzaz-app
npm run dev
```

## Optional Configuration

If this project uses a map provider, configure API tokens in widget `.env` files
as documented in the template source.

## Common Commands

```bash
npm run dev
npm run build
npm start
npm run widget <command>
```

## NitroStudio

NitroStudio is the fastest way to test and debug interactive widget output.

- Download: <https://nitrostack.ai/studio>
- Studio: <https://nitrostack.ai/studio>

## Links

- Docs: <https://docs.nitrostack.ai>
- Widgets docs: <https://docs.nitrostack.ai/sdk/typescript/ui/widgets>
- Main repository: <https://github.com/nitrocloudofficial/nitrostack>

## Community

- Discord: <https://discord.gg/uVWey6UhuD>
- X: <https://x.com/nitrostackai>
- YouTube: <https://www.youtube.com/@nitrostackai>
- LinkedIn: <https://linkedin.com/company/nitrostack-ai/>
- GitHub: <https://github.com/nitrostackai>

- Investigation Context Platform

A persistent AI-native cybersecurity investigation platform built using the NitroStack MCP Framework.

The Investigation Context Platform is an MCP (Model Context Protocol) server designed to help AI agents and security analysts manage cybersecurity investigations through structured tools, resources, and prompts. It maintains persistent investigation data using JSON-based storage, enabling AI systems to retain context across sessions and assist throughout the incident response lifecycle.

🚀 Features
🔍 Create and manage cybersecurity investigations
📂 Persistent JSON-based storage
🛠️ MCP Tools for investigation workflows
📚 MCP Resources for contextual data retrieval
💬 MCP Prompts for AI-guided investigations
📋 Investigation summaries and tracking
🧩 Modular architecture for easy extensibility
🤖 AI-ready design using the NitroStack MCP Framework
🏗️ Architecture
                    +----------------------+
                    |   AI Assistant       |
                    +----------+-----------+
                               |
                     Model Context Protocol
                               |
+-------------------------------------------------------------+
|            Investigation Context Platform (MCP)             |
|                                                             |
|  Tools   Resources   Prompts                               |
|      \        |        /                                   |
|        \      |      /                                     |
|          Investigation Service                             |
|                   |                                        |
|            JSON Storage Layer                              |
|                   |                                        |
|      data/investigations.json                              |
+-------------------------------------------------------------+
📁 Project Structure
src/
├── app.module.ts
├── index.ts
├── database/
│   └── json-storage.ts
│
├── modules/
│   ├── investigation/
│   │   ├── investigation.data.ts
│   │   ├── investigation.module.ts
│   │   ├── investigation.prompts.ts
│   │   ├── investigation.resources.ts
│   │   ├── investigation.service.ts
│   │   └── investigation.tools.ts
│   │
│   ├── evidence/
│   ├── entities/
│   ├── relationship/
│   ├── notes/
│   ├── tasks/
│   ├── reports/
│   └── search/
│
└── data/
    └── investigations.json
⚙️ Tech Stack
TypeScript
NitroStack MCP Framework
Node.js
Zod (Schema Validation)
JSON File Storage
📦 Installation

Clone the repository:

git clone https://github.com/<your-username>/investigation-context-platform.git

Navigate to the project:

cd investigation-context-platform

Install dependencies:

npm install
▶️ Running the Project

Development mode:

npm run dev

The server starts with:

MCP Server (STDIO Transport)
Widget Development Server
NitroStack Studio Support
💾 Data Persistence

The platform stores investigation data locally using JSON files.

data/
└── investigations.json

This allows investigation context to persist across server restarts without requiring a database.

🔧 Available MCP Components
Tools
Create Investigation
View Investigations
Search Investigations
Update Investigation Status
Assign Investigation
Add Investigation Notes
Attach Evidence
Generate Investigation Summary
Resources
Investigation List
Investigation Details
Prompts
AI-guided investigation assistance
Incident analysis prompts
Investigation workflow guidance
🔄 Investigation Workflow
Incident
    │
    ▼
Create Investigation
    │
    ▼
Assign Investigator
    │
    ▼
Collect Evidence
    │
    ▼
Add Notes & Timeline
    │
    ▼
Generate Summary
    │
    ▼
Resolve Investigation
🎯 Use Cases
Security Operations Centers (SOC)
Incident Response Teams
Digital Forensics
Threat Hunting
AI Security Assistants
Cybersecurity Research
🌟 Key Highlights
Persistent investigation context
AI-native architecture
Modular MCP implementation
JSON-based storage
Extensible design
Lightweight deployment
Built with NitroStack MCP
📌 Future Enhancements
Entity correlation
Evidence management
Relationship graph visualization
Advanced search
Investigation reporting
Dashboard widgets
Database support
Authentication & authorization
🤝 Contributing

Contributions are welcome! Feel free to fork the repository, open issues, and submit pull requests to improve the platform.

📄 License

This project is licensed under the MIT License.
