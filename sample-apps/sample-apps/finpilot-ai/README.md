# 💳 FinPilot AI — Agentic Personal Finance Server

> An autonomous, deterministic personal finance AI agent server for students built with NitroStack MCP Framework, featuring single-turn continuous multi-tool orchestration, financial rule decision engines, self-reflection, and proactive follow-up recommendations.

---

## 🎯 What Problem It Solves

Students often struggle with budgeting, overspending on subscriptions/dining, managing emergency safety nets, evaluating major purchases (e.g. buying an iPhone or laptop), and splitting group trip expenses.

**FinPilot AI** converts independent financial functions into a **true agentic AI system**. Rather than stopping after a single tool call and forcing the user to type manual instructions, FinPilot AI autonomously executes multi-tool pipelines (Ingestion $\rightarrow$ Categorization $\rightarrow$ Spending Analysis $\rightarrow$ Risk Detection $\rightarrow$ Emergency Reserve Check $\rightarrow$ Major Purchase Simulation $\rightarrow$ Health Scoring) in a **single turn**, delivering a formatted executive report with proactive next-step recommendations.

---

## ✨ Key Features

* 🤖 **Continuous Multi-Tool Execution Loop**: Automatically pipes tool outputs down execution chains (up to 10 steps per turn) without going idle or waiting for intermediate manual user prompts.
* 🧠 **Agentic Orchestration Layer**:
  * **`PlannerModule`**: Content-based smart router and compound intent pipeline engine.
  * **`WorkflowModule`**: Multi-step tool piping, confidence scoring (`{ confidence, warnings }`), and fuzzy CSV delimiter/header retry fallback.
  * **`DecisionModule`**: Financial rule engine enforcing emergency reserve priority over equities, low savings rate thresholds, and goal feasibility.
  * **`ReflectionModule`**: Post-workflow evaluation generating autonomous student subscription discount suggestions and food delivery trim recommendations.
* 📊 **16 Consolidated MCP Tools**: Consolidated tool suite keeping total registered items (16 tools + 1 prompt) strictly under NitroStudio's 30-item canvas limit.
* 🎨 **User-Friendly Executive Formatting**: Clean markdown output featuring health score badges, cashflow metrics, and copy-pasteable follow-up prompt suggestions.
* 🛡️ **Dual-Layer Memory**: Short-term session caching with long-term disk persistence (`data/finpilot_store.json`) for health history and risk profiles.

---

## 🛠️ Tech Stack

### Core Framework & Runtime
* **Framework**: [NitroStack MCP Framework](https://nitrostack.ai) (`@nitrostack/core`, `@nitrostack/cli`)
* **Runtime**: Node.js (v20+ ES Modules)
* **Language**: TypeScript (`^5.3.3`)
* **Transport**: STDIO (NitroStudio / Claude Desktop) + Streamable HTTP / SSE (Cloud Deployments)

### Dependencies (`package.json`)
```json
{
  "dependencies": {
    "@nitrostack/core": "^1.0.14",
    "zod": "^3.22.4",
    "dotenv": "^16.3.1",
    "@modelcontextprotocol/ext-apps": ">=0.1.0"
  },
  "devDependencies": {
    "@nitrostack/cli": "^1.0.15",
    "@types/node": "^22.10.0",
    "typescript": "^5.3.3"
  }
}
```

---

## 🚀 Setup Instructions

### 1. Prerequisites
* Node.js v20.0.0 or higher
* npm v10.0.0 or higher

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/agentx-server.git
cd agentx-server
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (optional defaults are built-in):
```env
NODE_ENV=development
PORT=3000
NITROSTACK_TRANSPORT=stdio
LOG_LEVEL=error
```

### 4. Running the Server

* **Local Development (Hot Reload)**:
  ```bash
  npm run dev
  ```
* **Production Build & Local STDIO Mode (for NitroStudio)**:
  ```bash
  npm start
  ```
* **Production Cloud Mode**:
  ```bash
  npm run start:prod
  ```
* **Run Verification Test Suite**:
  ```bash
  node smoke-test.mjs
  ```

---

## 📂 Folder & Module Structure

```text
agentx-server/
├── src/
│   ├── app.module.ts              # Root @McpApp module & dynamic transport configuration
│   ├── main.ts                    # Application entry point
│   ├── services/
│   │   └── finance-store.service.ts # In-memory & disk persistent financial data store
│   └── modules/
│       ├── planner/               # Master Agentic Orchestrator & Smart Router
│       ├── workflow/              # Workflow Execution Engine with Confidence & Retry
│       ├── decision/              # Financial Rule Engine (Emergency, Savings, Goals)
│       ├── reflection/            # Reflection Engine & Autonomous Recommendations
│       ├── ingestion/             # Transaction CSV Upload & Income Management Tool
│       ├── categorize/            # Expense Categorization Tool
│       ├── analysis/              # Spending Analysis & Category Breakdown Tool
│       ├── risk/                  # Risk Flag & Overspending Detection Tool
│       ├── savings/               # Savings Trim & 6-Month Emergency Reserve Tool
│       ├── goals/                 # Goal Analytics & Contribution Management Tool
│       ├── investment/            # SIP Calculator, Risk Planner & Fund Category Tool
│       ├── health-score/          # 0-100 Financial Health Scoring Tool
│       ├── simulation/            # Major Purchase & Relocation Scenario Tool
│       ├── group-expenses/        # Group Expense Splitting & Debt Ledger Tool
│       ├── marketplace/           # Student Discount Deals & Cashbacks Tool
│       ├── behaviour/             # Student Spending Behavior Persona Tool
│       ├── health-insurance/      # Metro Student Health Cover Audit Tool
│       ├── notification/          # Automated Overspending Alert Tool
│       ├── calendar/              # Financial Deadline Calendar Sync Tool
│       ├── insights/              # Subscription & Purchase Impact Tool
│       └── prompts/               # System Directives & System Prompts
├── data/
│   └── finpilot_store.json        # Long-term disk persistence store
├── smoke-test.mjs                 # Multi-step end-to-end test suite
├── package.json                   # Project dependencies & scripts
└── tsconfig.json                  # TypeScript configuration
```

---

## 💡 Usage Examples

### Example 1: Multi-Goal Compound Audit & Purchase Check
**User Prompt**:
> *"Analyze my finances and tell me if I can afford an iPhone for ₹75,000."*

**Automated Single-Turn Tool Execution**:
`categorize_expenses` $\rightarrow$ `analyze_spending` $\rightarrow$ `detect_risks` $\rightarrow$ `manage_savings_and_emergency_fund` $\rightarrow$ `simulate_life_event` $\rightarrow$ `compute_health_score`

**Output Response**:
```markdown
# 💳 FinPilot Financial Audit & Purchase Report

> 🎯 **Overall Health Score**: **`47 / 100`** *(Needs Attention)*  
> 🛡️ **AI Confidence Rating**: **`95%`**

---

### 🛍️ Major Purchase Evaluation: "iPhone" (`₹75,000`)
❌ **PURCHASE NOT RECOMMENDED**: Buying **iPhone** (`₹75,000`) will push your balance into a deficit around **month 1**.

---

### 📈 Monthly Cashflow Snapshot
* 💵 **Monthly Income**: **`₹60,000`**
* 💸 **Total Spend**: **`₹38,500`**
* ✂️ **Discretionary Trim Potential**: **`₹3,850 / month`**

---

### 💡 Suggested Follow-Up Prompts (Copy & Paste to Continue):
* 🛡️ *"Create an Emergency Safety Net Fund goal for ₹1,80,000"*
* 🛍️ *"What if I buy a cheaper ₹45,000 laptop alternative instead?"*
* 📈 *"Suggest a monthly SIP mutual fund plan for ₹3,000 based on my risk profile"*
```

---

## ⚠️ Known Limitations

1. **Rule-Based Categorization**: Categorization relies on keyword matching (`swiggy`, `uber`, `amazon`) and fuzzy heuristics rather than real-time open-banking API connections (hackathon scope).
2. **Single-Currency Support**: All monetary calculations assume INR (`₹`) formatting.
3. **Turn Execution Cap**: Multi-tool execution loops are capped at **10 tool calls per turn** to prevent infinite execution loops.

---

## 📜 License
MIT License. Built for the AgentX / NitroStack AI Agent Hackathon.
