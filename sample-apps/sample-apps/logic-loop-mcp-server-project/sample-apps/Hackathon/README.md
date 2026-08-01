# Omniscient: The AI-Driven DevSecOps & Strategic Command Center

**Omniscient** is a next-generation Model Context Protocol (MCP) server built with the NitroStack framework. It turns passive AI assistants (like Claude Desktop or Llama 3) into active, autonomous site reliability engineers, security analysts, and boardroom advisors. 

Rather than just pasting logs or asking for general advice, Omniscient gives the AI a structured set of tools to query live APIs, monitor infrastructure, run rollbacks, and make financial calculations based on strict corporate context.

---

## 🚀 Key Features & Architecture

Omniscient is divided into three core operational modules:

### 1. 🔐 Security Operations (SecOps)
Equips the AI with threat detection and active response capabilities.
*   **Live IP Reputation Lookup:** Calls `ip-api.com` in real-time to analyze ASN, ISP, and geo-data.
*   **Failed Authentication Audit:** Inspects simulated logins to detect brute-force attacks.
*   **Human-in-the-Loop Firewall Control:** Allows the AI to propose WAF rules to block malicious IPs, which are strictly gated by human confirmation.

### 2. ⚙️ Site Reliability Engineering (SRE)
Enables the AI to triage production outages and restore system health.
*   **Grafana Metrics Monitor:** Fetches live system CPU, RAM, and error rates.
*   **Kubernetes Logs Explorer:** Allows the AI to pull pod logs to pinpoint exception stack traces.
*   **Automated Rollback Engine:** Safely reverts broken deployments to the previous stable release (gates execution with human approval).

### 3. 👔 The Boardroom (Executive RAG)
Transforms the LLM into a virtual executive board (CFO, CMO, CTO) by injecting real company context to prevent hallucination.
*   **Context Grounding:** Forces the LLM to make decisions strictly based on actual company parameters ($4.2M cash, 12-month runway, 14 engineers, 12 P1 bugs, and 4% market share).
*   **CFO Agent:** Evaluates financial impact (runway reduction, ROI, cash reserves).
*   **CTO Agent:** Assesses technical feasibility and debt alignment.
*   **CMO Agent:** Analyzes market positioning and branding impact.

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- [NitroStudio](https://nitrostack.ai/studio) (recommended for visual testing)
- A Groq API Key (for the boardroom agents)

### 1. Install Dependencies
```bash
cd command-center
npm install
```

### 2. Configure Environment
Create a `.env` file in the root of the `command-center` directory:
```env
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Build & Run locally
```bash
npm run build
npm run dev
```

---

## 💬 Demo & Pitch Prompts

Use these prompts in Nitro Studio or Claude Desktop to show off the system in action:

### 🛡️ SecOps Demo
*   **Prompt:** `"Can you analyze the IP reputation for 167.99.20.1?"`
    *   *(Shows the live API fetch and marks it as a datacenter IP).*
*   **Prompt:** `"Please update the firewall to block 167.99.20.1."`
    *   *(Triggers the Human-in-the-Loop approval gate).*

### 📟 SRE Incident Response Demo
*   **Prompt:** `"I just got a PagerDuty alert that our website is down. Fetch the Grafana metrics for 'frontend-web', check the Kubernetes logs to see what's wrong, and if it looks like a bad deployment, ask me for permission to roll it back."`
    *   *(Shows multi-tool orchestration, outage diagnosis, and safe rollback).*

### 💼 Executive Boardroom Demo
*   **Prompt:** `"We are considering acquiring a small startup for $1.5 million just to acquire their senior engineering talent and intellectual property. Ask the Boardroom (CFO, CMO, CTO) for a full assessment."`
    *   *(Grounds the analysis in the dummy company database. CFO warns about cutting the $4.2M cash reserves, and CTO flags our 12 P1 bugs).*

---

## 🔌 Connecting to Claude Desktop
To test this directly inside your Claude Desktop client, open your Claude config file (`%APPDATA%\Claude\claude_desktop_config.json`) and configure the server:

```json
{
  "mcpServers": {
    "command-center": {
      "command": "node",
      "args": [
        "C:\\Users\\<Your-Username>\\OneDrive\\Desktop\\Nitrostack\\command-center\\dist\\index.js"
      ],
      "env": {
        "GROQ_API_KEY": "your_groq_api_key_here"
      }
    }
  }
}
```

*Note: Make sure to restart Claude Desktop fully after saving this file.*

---

*   **Framework:** Built on Model Context Protocol (MCP) using NitroStack.
*   **Design Pattern:** Human-in-the-loop validation for mutating infrastructure operations.
*   **RAG Method:** Context Injection prompting to prevent synthetic metrics hallucination in LLM agents.
