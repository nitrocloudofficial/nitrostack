# Walkthrough - DeploySense AI Simulation Framework (Steps 1 & 2)

We have successfully implemented the first two phases of the simulation framework:
1. **Simulation Data Structure** with 3 distinct incident scenarios.
2. **Linked MCP Services** (Github, Kubernetes, Logs, Metrics, Jira, Slack, Report, and Config) reading dynamically from the active scenario state.

---

## 🛠️ Validation Script Results

We ran the automated verification script `test-scenarios.js` which spins up the services, programmatically cycles through all 3 scenarios, and asserts the root cause detection:

```
🚀 Instantiating Services for Scenario Tests...
   ✅ Services instantiated successfully.

-----------------------------------------------------------------
Setting active scenario to: scenario1
Executing investigation...

Results for SCENARIO1:
Incident ID:   TEST-SCENARIO1
Scenario Name: Missing Environment Variable in PaymentService
Confidence:    96%
Root Cause:    Missing Stripe API Key. Recent Stripe client integration commit failed due to missing STRIPE_API_KEY environment variable.
Jira Ticket:   INC-1025 - https://jira.example.com/browse/INC-1025

Reasoning Timeline Steps:
  [INFO] Incident Commander received goal: Investigate incident TEST-SCENARIO1 on payment-service
  [ERROR] Queries Metrics MCP -> Detected CPU usage at 94.2% and error rate at 48.7% (spiking)
  [ERROR] Queries Kubernetes MCP -> Pod payment-service-86d7f9c-x987y is in status: CrashLoopBackOff (Restarts: 14)
  [WARNING] Queries GitHub MCP -> Recent change detected: "feat: integrate new Stripe API client for payment processing" by payment-dev@example.com
  [ERROR] Queries Logs MCP -> Found error trace: "java.lang.NullPointerException: Cannot invoke 'String.length()' because 'stripeApiKey' is null"
  [WARNING] Reasoning Engine: Identified potential triggers, but not enough evidence to confirm cause. Confidence = 68%
  [INFO] Queries Configuration MCP -> Inspecting environment variables and parameters for payment-service
  [SUCCESS] Configuration MCP -> Confirmed missing required environment variable: STRIPE_API_KEY. Confidence = 96%
  [SUCCESS] Notified Slack channel #incidents with root cause analysis
  [SUCCESS] Created Jira ticket INC-1025 with severity SEV-1
  [SUCCESS] Generated post-mortem incident report

🎉 Verification Passed: Root cause matches expectation!
-----------------------------------------------------------------

-----------------------------------------------------------------
Setting active scenario to: scenario2
Executing investigation...

Results for SCENARIO2:
Incident ID:   TEST-SCENARIO2
Scenario Name: Database Connection Pool Exhaustion
Confidence:    95%
Root Cause:    Database Connection Pool Exhaustion. DB_POOL_MAX set to 2 is insufficient for traffic load, causing hikaricp timeout exceptions.
Jira Ticket:   INC-1026 - https://jira.example.com/browse/INC-1026

Reasoning Timeline Steps:
  [INFO] Incident Commander received goal: Investigate incident TEST-SCENARIO2 on user-service
  [ERROR] Queries Metrics MCP -> Detected CPU usage at 24.3% and error rate at 12.5% (increasing)
  [SUCCESS] Queries Kubernetes MCP -> Pod user-service-75fa6d-x111y is in status: Running (Restarts: 0)
  [WARNING] Queries GitHub MCP -> Recent change detected: "docs: update API documentation endpoints" by user-dev@example.com
  [ERROR] Queries Logs MCP -> Found error trace: "org.postgresql.util.PSQLException: FATAL: remaining connection slots are reserved for non-replication superuser connections"
  [WARNING] Reasoning Engine: Identified potential triggers, but not enough evidence to confirm cause. Confidence = 75%
  [INFO] Queries Configuration MCP -> Inspecting environment variables and parameters for user-service
  [SUCCESS] Configuration MCP -> Confirmed bottleneck: DB_POOL_MAX is configured too low (2). Confidence = 95%
  [SUCCESS] Notified Slack channel #incidents with root cause analysis
  [SUCCESS] Created Jira ticket INC-1026 with severity SEV-1
  [SUCCESS] Generated post-mortem incident report

🎉 Verification Passed: Root cause matches expectation!
-----------------------------------------------------------------

-----------------------------------------------------------------
Setting active scenario to: scenario3
Executing investigation...

Results for SCENARIO3:
Incident ID:   TEST-SCENARIO3
Scenario Name: Memory Leak in Session Cache
Confidence:    98%
Root Cause:    Session cache Memory Leak. Unbounded caching of sessions without eviction causing OOMKilled state.
Jira Ticket:   INC-1027 - https://jira.example.com/browse/INC-1027

Reasoning Timeline Steps:
  [INFO] Incident Commander received goal: Investigate incident TEST-SCENARIO3 on auth-service
  [INFO] Queries Metrics MCP -> Detected CPU usage at 65.2% and error rate at 8.4% (increasing)
  [ERROR] Queries Kubernetes MCP -> Pod auth-service-7f8b9c4d-x2y3z is in status: OOMKilled (Restarts: 6)
  [WARNING] Queries GitHub MCP -> Recent change detected: "feat: cache user sessions locally to speed up validation" by auth-dev@example.com
  [ERROR] Queries Logs MCP -> Found error trace: "java.lang.OutOfMemoryError: Java heap space"
  [SUCCESS] Reasoning Engine: Memory metrics and OOMKilled pod state correlate perfectly. Confidence = 98%
  [SUCCESS] Notified Slack channel #incidents with root cause analysis
  [SUCCESS] Created Jira ticket INC-1027 with severity SEV-1
  [SUCCESS] Generated post-mortem incident report

🎉 Verification Passed: Root cause matches expectation!
-----------------------------------------------------------------
```

All 3 scenarios have passed verification.

---

## 🔎 How to Run and Verify in NitroStudio IDE

1. **Start the local server**:
   In your terminal, start the local MCP development server:
   ```bash
   npm run dev
   ```
2. **Switch between scenarios**:
   Open a secondary terminal, and use the helper script to change active scenarios:
   - For Scenario 1: `node set-scenario.js scenario1`
   - For Scenario 2: `node set-scenario.js scenario2`
   - For Scenario 3: `node set-scenario.js scenario3`
3. **Trigger in NitroStudio**:
   - Launch **NitroStudio**.
   - Load the `deploysense-ai` server (pointing it to the standard transport, e.g. stdio via the command runner).
   - In the **MCP Tools** tab, find and invoke `investigateIncident` from the Investigation module (with any test incident ID, e.g. `INC-1025`).
   - Verify the returned JSON contains the correct scenario details, reasoning timeline, and confidence score.

---

## ☁️ How to Run and Deploy to NitroCloud

Since **NitroCloud** is the managed serverless platform for NitroStack:

1. **Prepare Code**: Commit your changes and push them to your GitHub repository:
   ```bash
   git add .
   git commit -m "feat: add simulation scenarios and link MCP services"
   git push origin main
   ```
2. **Deploy via NitroCloud Dashboard**:
   - Go to the **NitroCloud Dashboard** (`https://nitrostack.ai/cloud` or similar console).
   - Connect your GitHub repository.
   - Choose the root directory of your project.
   - NitroCloud will automatically detect the **NitroStack project structure**, build it via `npm run build`, and provision a secure serverless HTTP SSE deployment endpoint (e.g., `https://deploysense-ai.nitrocloud.app/mcp`).
3. **Verify Public Endpoint**:
   - Connect your LLM client or NitroStudio directly to the public URL using the HTTP SSE transport mode.
   - You can toggle the scenario by pushing config commits or changing settings on the cloud deployment environment variables.
