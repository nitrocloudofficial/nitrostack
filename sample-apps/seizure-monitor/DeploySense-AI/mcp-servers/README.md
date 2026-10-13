# DeploySense AI ── Incident Commander MCP Server

DeploySense AI is an agentic AI reasoning engine built on top of the **NitroStack MCP Framework**. It acts as an automated **Incident Commander** that investigates, diagnoses, and documents post-deployment production failures using 8 integrated MCP tools and state-driven simulation scenarios.

---

## 🛠️ Project Architecture

```
Deploy-AI/
├── src/                          # TypeScript source files
│   ├── modules/                  # Application Modules
│   │   ├── config/               # Scenario and environment configuration
│   │   ├── github/               # Git commits and diff operations
│   │   ├── kubernetes/           # Pod status and orchestration checks
│   │   ├── logs/                 # Log extraction and error pattern search
│   │   ├── metrics/              # System utilization and telemetry data
│   │   ├── jira/                 # Incident ticket creation and tracking
│   │   ├── slack/                # Production alert notifications
│   │   ├── report/               # Post-mortem incident documentation
│   │   └── investigation/        # Core agentic workflow prompts & tools
│   ├── app.module.ts             # Root AppModule
│   └── index.ts                  # Application entry point
├── simulation-data/              # Mock telemetry and scenario definitions
│   ├── scenarios/                # Scenarios 1, 2, and 3 JSON files
│   └── active-scenario.json      # Curated state of the active simulation
├── set-scenario.js               # CLI helper to switch scenarios dynamically
├── package.json                  # Dependencies and build scripts
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 📦 Supported MCP Tools

DeploySense AI registers 8 primary diagnostic and resolution tools:

1. **`metrics`**: Query CPU utilization, memory, error rates, and response times.
2. **`kubernetes`**: Check container pod statuses (e.g. `CrashLoopBackOff`, `OOMKilled`) and restart counts.
3. **`github`**: Review recent code commits, authors, and file diffs.
4. **`logs`**: Inspect system logs and search for runtime exceptions (e.g., `NullPointerException`).
5. **`config`**: Inspect service environment variables and configuration states.
6. **`slack`**: Dispatch alerts and updates to the `#incidents` communication channel.
7. **`jira`**: Create, edit, and escalate Severity-1 incident tickets.
8. **`report`**: Generate structured markdown post-mortem reports.

---

## 🧪 Simulation Scenarios

DeploySense AI includes 3 pre-configured incident scenarios that you can switch between to test the agentic reasoning:

### 🔹 Scenario 1: Missing Environment Variable (`INC-1025`)
* **Service**: `PaymentService`
* **Trigger**: A new code deployment introducing a Stripe payment integration.
* **Failure**: Missing `STRIPE_API_KEY` environment variable.
* **Symptoms**: Pods in `Running` state, but error rates spike to 15% with `NullPointerException` traces.

### 🔹 Scenario 2: DB Connection Pool Exhaustion (`INC-1026`)
* **Service**: `InventoryService`
* **Trigger**: A configuration change reducing database pool size under load.
* **Failure**: `DB_POOL_MAX` set to `2` (too low).
* **Symptoms**: High response times (over 5000ms) and database connection timeout errors.

### 🔹 Scenario 3: Session Cache Memory Leak (`INC-1027`)
* **Service**: `AuthService`
* **Trigger**: A commit adding local session caching without eviction.
* **Failure**: Unbounded memory growth.
* **Symptoms**: Pod status showing **`OOMKilled`** with `java.lang.OutOfMemoryError` in logs.

---

## 🚀 Quick Start Guide

### 1. Build and Compile the Code
Compile the TypeScript source files into the executable distribution:
```bash
npm run build
```

### 2. Start the MCP Server
Run the local development server (spins up the widget compilation and starts the server process):
```bash
npm run dev
```

### 3. Switch Scenarios (CLI)
To set the active scenario state, run the CLI utility from the root directory:
```bash
# To test Stripe API Key issue (INC-1025)
node set-scenario.js scenario1

# To test DB Pool issue (INC-1026)
node set-scenario.js scenario2

# To test Memory Leak issue (INC-1027)
node set-scenario.js scenario3
```

---

## 💻 Running the Agent in NitroStudio

1. Download and open **NitroStudio** (https://nitrostack.ai/studio).
2. Connect your project by pointing it to:
   `C:\Users\srini\Deploy-AI` (or your local clone path).
3. Go to the **AI Chat** pane on the left sidebar.
4. Ensure the agent mode toggle (bottom right) is set to **`Studio`** (not `Composer`).
5. Type and send the investigation instruction:
   ```text
   Investigate incident INC-1025
   ```
   *(Replace with `INC-1026` or `INC-1027` depending on the active scenario you selected)*.

The agentic Incident Commander will execute the diagnostics step-by-step, explain its logic, and output the root cause analysis, Slack alerts, Jira ticket creation details, and the final post-mortem report in clear, structured markdown!
