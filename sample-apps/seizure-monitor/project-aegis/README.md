# 🛡️ Project Aegis (Anti-Gravity FinTech Edition)

Project Aegis is a simulated core-banking resilience and high-frequency continuity shield demonstration. It is built as a Multi-Agent System (MAS) via the Model Context Protocol (MCP) using **NitroStack**.

---

## 🚀 System Architecture & Micro-Agents

Aegis coordinates multi-agent consensus and resilience shields across several dedicated agents:

- **PRIME Orchestrator**: Central coordinator for telemetry processing, Incremental SVD calculation, anomaly detection, and agent cascade orchestration.
- **ATLAS (SRE Agent)**: Manages load shedding, traffic shaping, and QoS Shunting shields.
- **CERBERUS (Security Agent)**: Manages cryptographic transaction hashing, request deduplication, and Idempotency locking.
- **HERMES (Compliance Agent)**: Oversees single-flight request coalescing and transaction integrity validation.

---

## 🎨 UI Pages & Control Dashboards

The application features a clean, light-themed modern web dashboard (`#F7F9FC` background with bright cyan `#29C5CE` and primary blue `#3B7DD8` accents):

1. **User Login Interface (`/login`)**: Authentication portal for system engineers and operators.
2. **SRE Control Panel & Tools (`/tools` / `/sre-control-panel`)**: Central command center providing real-time telemetry, active shield status, and swarm event logs.
3. **Agent Control Center (`/aegis-agent-control-center`)**: Real-time monitoring and control of each active agent with telemetry controls.
4. **Incident Response & Stress Test Report (`/incident-report`)**: Detailed incident analysis (INC-20260726-001) with root cause breakdown, active shield metrics, ledger impact assessments, and 5 key operational recommendations.

---

## 🩺 System Health Check Registry

Aegis includes an automated health check subsystem querying the operational status of all active components:

- `cbs_connection`: Core Banking System Connection Health
- `prime_health`: PRIME Orchestrator Operational Status
- `atlas_health`: ATLAS SRE Agent Health
- `cerberus_health`: CERBERUS Security Agent Health
- `hermes_health`: HERMES Compliance Agent Health
- `svd_health`: Incremental SVD Engine Health

---

## 🔬 Mathematical & Systems Implementation

### Actual Mathematical & Systems Implementations:
- **Incremental SVD Sketching:** The `IncrementalSVDEngine` implements a real Frequent-Directions-style matrix sketch over a 4-dimensional telemetry vector in $O(k \cdot d)$ time.
- **Exponential Decay & Filtering:** Uses exponential decay weighting ($\lambda = 0.95$) to adapt to volume growth and an $L_1$-norm clamp to reject extreme single-frame log corruptions.
- **Anomaly Detection:** Computes the $L_2$ norm of the residual vector after projecting telemetry onto the healthy subspace: $\|(I - P_S)x\|$.
- **Remediation & Resilience Shields:**
  - **SingleFlightGate**: Coalesces duplicate concurrent read transactions.
  - **IdempotencyEnforcer**: Cryptographic lock out of duplicate submission attempts within a TTL window.
  - **QosShunting**: Token-bucket priority shunting during load spikes.

---

## ⚡ Multi-Scenario Stress Testing

Simulate real-world thundering herd and concurrency issues directly from the control dashboard or via MCP tools:

- **Salary Day Storm (`simulate_salary_day_storm`)**: Simulates concurrent thundering-herd read/write spikes.
- **P2P Transfer Surge (`simulate_p2p_transfer_surge`)**: Simulates network layer saturation and high transaction volumes.
- **EOD Batch Collision (`simulate_eod_batch_collision`)**: Simulates ledger lock contention during end-of-day batch processing.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation
```bash
npm install
```

### Running Locally
To start the Aegis MAS MCP Server and backend services:
```bash
npm run dev
```

To build the Next.js widget static bundles:
```bash
cd src/widgets
npm run build
```

---

## ⚠️ Disclaimer

**This project is a simulation for demonstration purposes only.** There is no real bank, no real money, and no real customer data anywhere in this system. Everything runs against a mock in-memory ledger initialized with synthetic data.
