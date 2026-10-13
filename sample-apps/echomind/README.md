# 🧠 EchoMind

> **AI-Powered Engineering Investigation Platform**
> Accelerate software incident investigations by correlating code changes, technical documentation, and historical incidents using the Model Context Protocol (MCP) and NitroStack.

---

## 📖 Overview

EchoMind is an AI-powered engineering investigation assistant designed to help software teams identify the root cause of production issues faster.

Instead of manually searching through repositories, documentation, and previous incidents, EchoMind gathers relevant engineering evidence and presents it through an interactive widget-based interface.

Built on **NitroStack**, EchoMind leverages the **Model Context Protocol (MCP)** to expose intelligent tools that AI assistants can invoke during investigations. NitroStack provides a modular architecture with tools, resources, prompts, and interactive widgets for building production-ready MCP servers.

---

# ✨ Features

* 🔍 Create and manage investigation cases
* 💻 Collect code evidence related to incidents
* 📚 Search engineering documentation
* 🔄 Find similar historical incidents
* 🧩 Interactive NitroStack widgets
* ⚡ Modular MCP architecture
* 🛡️ Type-safe APIs using TypeScript & Zod
* 🚀 Ready for production deployment

---

# 🏗️ Architecture

```
                 ┌────────────────────────┐
                 │      AI Assistant      │
                 └────────────┬───────────┘
                              │
                     Model Context Protocol
                              │
                ┌─────────────▼─────────────┐
                │        EchoMind MCP       │
                └─────────────┬─────────────┘
                              │
      ┌────────────┬──────────┼──────────┬─────────────┐
      │            │          │          │             │
Create Case   Code Evidence   Docs   Similar Cases  Widgets
      │            │          │          │             │
      └────────────┴──────────┴──────────┴─────────────┘
                              │
                     Engineering Knowledge
```

---

# 🛠️ Tech Stack

### Backend

* TypeScript
* Node.js
* NitroStack
* Model Context Protocol (MCP)
* Zod

### Frontend

* React
* Next.js
* NitroStack Widgets
* Tailwind CSS

---

# 📂 Project Structure

```
EchoMind/
│
├── src/
│   ├── modules/
│   │   └── echomind/
│   │       ├── tools/
│   │       ├── resources/
│   │       ├── prompts/
│   │       └── services/
│   │
│   ├── widgets/
│   │   └── app/
│   │       └── investigation-result/
│   │
│   ├── app.module.ts
│   └── index.ts
│
├── data/
├── package.json
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

* Node.js 20+
* npm
* NitroStack CLI

Install the CLI:

```bash
npm install -g @nitrostack/cli
```

or use `npx` if preferred.

---

## Installation

Clone the repository:

```bash
git clone https://github.com/batversee/EchoMind.git
```

Navigate into the project:

```bash
cd EchoMind
```

Install dependencies:

```bash
npm install
```

---

# ▶️ Running the Project

Development mode:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Start production server:

```bash
npm start
```

NitroStack projects support development, build, and production workflows through the CLI.

---

# 🔧 Available MCP Tools

| Tool                      | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `create_case`             | Create a new investigation case                |
| `collect_code_evidence`   | Gather relevant code changes and commits       |
| `list_cases`              | Retrieve existing investigation cases          |
| `add_evidence`            | Attach supporting evidence to an investigation |
| `search_engineering_docs` | Search engineering documentation               |
| `find_similar_incidents`  | Retrieve related historical incidents          |

---

# 📦 Resources

* Engineering status resource
* Widget resources
* Health check resource

---

# 💬 Prompts

* Investigation assistance prompt
* Guided incident analysis workflow

---

# 🎨 Interactive Widgets

EchoMind includes a custom investigation widget that visualizes engineering evidence in an intuitive interface, making incident analysis faster and easier.

Features include:

* Investigation timeline
* Evidence cards
* Loading animations
* Interactive results
* Widget-based MCP responses

---

# 🌟 Future Enhancements

* GitHub integration
* Jira integration
* Slack notifications
* CI/CD pipeline analysis
* AI-generated root cause summaries
* Automatic incident reports
* Semantic code search
* Repository-wide knowledge graph
* Vector database integration
* Multi-agent investigation workflow

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/my-feature
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push to your branch

```bash
git push origin feature/my-feature
```

5. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

**Sukhesh Varma**

GitHub: https://github.com/batversee

---

# ⭐ Support

If you found this project useful:

* ⭐ Star the repository
* 🍴 Fork the project
* 🐛 Report issues
* 💡 Suggest new features

Your support helps improve EchoMind and makes AI-assisted engineering investigations more accessible to developers.
