<p align="center">
  <img src="images/banner.png" alt="HelmsMan Banner" width="100%">
</p>

<h1 align="center">⚓ HelmsMan</h1>

<p align="center">
<b>Autonomous Kubernetes Remediation using the Model Context Protocol (MCP)</b>
</p>

<p align="center">

[![Track](https://img.shields.io/badge/Track-Cloud--Native-blue.svg)](#)
[![Framework](https://img.shields.io/badge/Framework-NitroStack_MCP-orange.svg)](#)
[![Platform](https://img.shields.io/badge/Kubernetes-kind-326CE5.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](#)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-success.svg)](#)

</p>

<p align="center">
AI-powered Kubernetes remediation where multiple AI agents negotiate infrastructure changes while a deterministic safety engine guarantees application availability.
</p>

---

# 📖 Overview

Modern Kubernetes operations remain largely reactive. Existing autoscalers respond only to CPU or memory thresholds, while engineers manually decide whether infrastructure changes are safe. This often results in over-provisioned clusters, higher cloud costs, and accidental downtime.

**HelmsMan** is an autonomous remediation platform built on the **Model Context Protocol (MCP)** that introduces **multi-agent reasoning** for Kubernetes operations.

Instead of allowing a single AI model to directly manipulate infrastructure, HelmsMan coordinates multiple specialized agents that negotiate proposed actions while a deterministic safety engine validates every operation against the live Kubernetes cluster before execution.

The result is an intelligent remediation framework that optimizes infrastructure costs **without compromising reliability or application availability**.

---

# 🚀 Key Highlights

- 🤖 Multi-Agent AI Decision Making
- ☸️ Live Kubernetes Cluster Integration
- 🛡️ Deterministic Safety Engine
- 💰 Cost-Aware Infrastructure Optimization
- 📜 Complete Audit Trail
- 🔌 Native MCP Tools, Resources & Prompts
- ⚡ Built using the NitroStack MCP SDK

---

# ❗ Problem Statement

Managing Kubernetes clusters requires continuous monitoring and operational expertise.

Platform engineers frequently ask questions like:

- Which deployment should be scaled?
- Can replicas safely be reduced?
- Will scaling violate a PodDisruptionBudget?
- Should a deployment be rolled back?
- Is the cluster healthy enough for remediation?

Current Kubernetes autoscalers react only to infrastructure metrics such as CPU or memory utilization.

They **cannot reason about operational safety**.

As a result, organizations often face:

- 💸 Over-provisioned infrastructure
- ⚠️ Unsafe scaling decisions
- 🧑💻 Continuous manual intervention
- 🚨 Increased operational risk
- 📈 Higher cloud costs

---

# 💡 Our Solution

HelmsMan transforms Kubernetes operations from **reactive monitoring** into **autonomous, policy-aware remediation**.

Instead of reacting solely to metrics, HelmsMan continuously reasons over the **live Kubernetes cluster state** before executing any action.

The remediation workflow consists of:

1. Reading the live Kubernetes cluster
2. Understanding deployments, pods, nodes and disruption budgets
3. Negotiating infrastructure changes using specialized AI agents
4. Validating every proposed action against Kubernetes safety policies
5. Executing only operations that preserve application availability

Unlike traditional AI systems, **HelmsMan never trusts LLM output alone**.

Every infrastructure change is validated against the **real Kubernetes API** before execution.

---

# 🔄 Multi-Agent Workflow

<p align="center">
    <img src="images/architecture-flow.png" alt="Workflow" width="950">
</p>

HelmsMan orchestrates two specialized AI agents that collaboratively determine the safest remediation strategy.

## 💰 FinOps Agent

The FinOps Agent focuses on **cost optimization**.

Responsibilities include:

- Detecting idle workloads
- Identifying over-provisioned deployments
- Recommending replica reductions
- Improving infrastructure utilization
- Reducing cloud costs

---

## 🛡️ Availability Guardian

The Availability Guardian protects application reliability.

Responsibilities include:

- Evaluating deployment health
- Inspecting PodDisruptionBudgets
- Preventing unsafe scale-down operations
- Validating availability constraints
- Reviewing every remediation proposal

---

## 🔐 Safety Engine

The Safety Engine serves as the final authority.

Before executing any infrastructure action, it validates:

- Deployment status
- Replica count
- PodDisruptionBudget requirements
- Minimum available replicas
- Cluster health

If any Kubernetes availability policy would be violated, the operation is rejected before reaching the Kubernetes API.

---

# 🏗️ System Architecture

<p align="center">
    <img src="images/architecture.png" alt="Architecture" width="1000">
</p>

The architecture combines AI reasoning with deterministic policy enforcement.

Rather than allowing AI agents to directly manipulate Kubernetes resources, every remediation request passes through the MCP server where infrastructure policies are validated before execution.

This separation guarantees that safety remains deterministic regardless of AI output.

---

# 📊 Dashboard

<p align="center">
    <img src="images/dashboard.jpeg" alt="Dashboard" width="1000">
</p>

The HelmsMan dashboard provides real-time visibility into:

- Cluster topology
- Deployment health
- Pod readiness
- Infrastructure metrics
- AI agent decisions
- Approved actions
- Rejected actions
- Audit history

Operators can inspect the complete remediation lifecycle while maintaining full transparency over every infrastructure decision.

---

# ✨ Core Features

| Feature | Description |
|----------|-------------|
| 🤖 Multi-Agent Decision Making | FinOps Agent and Availability Guardian negotiate every remediation action |
| ☸️ Live Kubernetes Integration | Connects directly to Deployments, Pods, Nodes, Services and PodDisruptionBudgets |
| 🛡️ Deterministic Safety Engine | Rejects unsafe operations before they reach Kubernetes |
| 💰 Cost Optimization | Detects over-provisioned workloads and recommends efficient scaling |
| 📜 Complete Audit Trail | Records every approved and remediation action |
| 🔌 Native MCP Server | Implements Tools, Resources and Prompts using the Model Context Protocol |
| ⚡ Live Cluster Reasoning | Makes decisions using the current Kubernetes cluster state rather than static metrics |

---

# 🌐 Live Kubernetes Integration

HelmsMan communicates directly with a running Kubernetes cluster.

Supported Kubernetes resources include:

- Deployments
- Pods
- ReplicaSets
- Nodes
- Services
- Namespaces
- PodDisruptionBudgets
- kube-state-metrics

Unlike simulation-based demonstrations, every decision shown by HelmsMan is derived from the **live Kubernetes API**, ensuring that AI agents reason over the actual state of the cluster.

---

# 🛡️ Safety First

Safety is enforced **programmatically**, not through AI reasoning alone.

Every proposed remediation undergoes:

- Live Kubernetes API validation
- Replica verification
- PodDisruptionBudget inspection
- Availability policy enforcement
- Cluster health verification

Only validated operations are executed.

Unsafe operations are rejected automatically, ensuring that remediation never compromises application availability.

---

# 🧠 MCP Capabilities

HelmsMan is built as a native **Model Context Protocol (MCP)** server using the **NitroStack MCP SDK**.

The server exposes Kubernetes functionality through **MCP Tools**, **Resources**, and **Prompts**, allowing AI agents to inspect, reason over, and safely operate a live Kubernetes cluster.

---

## 🔧 MCP Tools

| Tool | Description |
|------|-------------|
| `get_cluster_state()` | Returns a live summary of the Kubernetes cluster |
| `get_pod_health(namespace)` | Retrieves pod health information |
| `list_deployments(namespace)` | Lists deployments in a namespace |
| `scale_deployment(name, replicas)` | Safely scales deployments after policy validation |
| `rollback_deployment(name)` | Rolls back a deployment revision |
| `cordon_node(node)` | Marks a node as unschedulable |
| `uncordon_node(node)` | Makes a node schedulable again |
| `drain_node(node)` | Safely drains a Kubernetes node |

---

## 📚 MCP Resources

| Resource | Description |
|-----------|-------------|
| `k8s://cluster/topology` | Live cluster topology |
| `k8s://cluster/nodes` | Node information |
| `k8s://cluster/deployments` | Deployment summaries |
| `k8s://policy/disruption-budgets` | PodDisruptionBudget details |
| `k8s://audit/history` | Complete remediation history |
| `k8s://cluster/metrics` | Metrics from kube-state-metrics |

---

## 💬 MCP Prompts

### `cluster_health_brief`

Provides:

- Overall cluster health
- Deployment summary
- Infrastructure recommendations
- Resource utilization
- Operational insights

---

### `change_record`

Produces:

- Requested action
- Approval status
- Rejection reason
- Safety validation
- Audit history

---

# ⚙️ Technology Stack

| Category | Technology |
|-----------|------------|
| Programming Language | TypeScript |
| Runtime | Node.js |
| MCP Framework | NitroStack MCP SDK |
| Container Platform | Docker Desktop |
| Container Orchestration | Kubernetes |
| Local Cluster | kind |
| Kubernetes CLI | kubectl |
| Metrics | kube-state-metrics |
| Kubernetes Client | Kubernetes Client SDK |
| AI Integration | xAI Grok API (via OpenAI SDK) |

---

# 📂 Project Structure

```text
helmsman/
│
├── src/
│   ├── agents/
│   │   ├── orchestrator.ts
│   │   ├── executor.ts
│   │   ├── prompts.ts
│   │   └── tools.ts
│   │
│   ├── modules/
│   │   └── k8s/
│   │       ├── client.ts
│   │       ├── k8s.module.ts
│   │       ├── k8s.tools.ts
│   │       ├── k8s.resources.ts
│   │       ├── k8s.prompts.ts
│   │       ├── safety.ts
│   │       ├── audit.ts
│   │       └── policy.data.ts
│   │
│   ├── app.module.ts
│   └── index.ts
│
├── manifests/
│   ├── namespace.yaml
│   ├── pdbs.yaml
│   └── kube-state-metrics.yaml
│
├── scripts/
│   ├── setup-cluster.ps1
│   ├── setup.sh
│   ├── reset-demo.ps1
│   └── demo-chaos.sh
│
├── images/
│
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Before running HelmsMan, ensure the following are installed:

- Node.js **18+**
- Docker Desktop
- Kubernetes CLI (`kubectl`)
- kind
- NitroStudio
- NitroStack CLI
- xAI Grok API Key

Verify your installation:

```bash
node -v
docker --version
kubectl version --client
kind version
```

---

# 📦 Installation

Clone the repository.

```bash
git clone https://github.com/<your-username>/helmsman.git
```

Navigate to the project.

```bash
cd helmsman
```

Install dependencies.

```bash
npm install
```

Configure Environment Variables. Create a `.env` file and set your Grok API key:

```env
GROK_API_KEY=your_xai_api_key_here
```

---

# ☸️ Create the Kubernetes Cluster

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-cluster.ps1
```

### Linux / macOS

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Or manually create a cluster:

```bash
kind create cluster --name helmsman
```

Verify the cluster:

```bash
kubectl get nodes
```

---

# 📥 Deploy Demo Resources

Deploy the sample workloads and policies.

```bash
kubectl apply -f manifests/
```

Verify the deployment.

```bash
kubectl get all -A
```

---

# 🔨 Build the Project

Compile the MCP server.

```bash
npm run build
```

---

# 🧪 Run Safety Tests

Execute the safety validation suite.

```bash
npm run test:safety
```

Expected output:

```text
Running Safety Tests...

✔ Replica validation
✔ PodDisruptionBudget enforcement
✔ Safe scaling
✔ Unsafe scaling rejection

Safety self-check: PASSED
```

---

# ▶️ Start the MCP Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

---

# 🖥️ Connect Using NitroStudio

1. Launch NitroStudio.
2. Open the HelmsMan project.
3. Start the MCP server.
4. Connect to the running server.
5. Explore the available:
   - Tools
   - Resources
   - Prompts

Once connected, HelmsMan is ready to receive AI agent requests.

---

# 🎬 Demo Walkthrough

## Step 1 — Start the Cluster

```bash
kubectl get nodes
```

Verify that the cluster is healthy.

---

## Step 2 — Deploy the Sample Application

Deploy an intentionally over-provisioned workload.

```text
Deployment: checkout-service

Replicas: 5
```

---

## Step 3 — FinOps Agent Suggests Optimization

The FinOps Agent recommends:

```text
Scale checkout-service

5 replicas

↓

1 replica
```

---

## Step 4 — Availability Guardian Review

The Availability Guardian evaluates:

- Deployment health
- Current replicas
- PodDisruptionBudget
- Minimum available pods

---

## Step 5 — Safety Validation

Before execution, the Safety Engine validates the request using the live Kubernetes API.

Example response:

```json
{
  "approved": false,
  "reason": "Scaling would violate PodDisruptionBudget"
}
```

Unsafe operations are rejected immediately.

---

## Step 6 — View the Audit Trail

Run the following prompt:

```text
change_record
```

The audit includes:

- Requested operation
- Approval status
- Timestamp
- Validation checks
- Rejection reason

---

## Step 7 — Verify Cluster State

```bash
kubectl get pods
```

The deployment remains healthy and no pods are terminated because the Safety Engine blocked the unsafe action.

---

# 📈 Observability

HelmsMan continuously reasons over:

- Deployments
- ReplicaSets
- Pods
- Nodes
- Services
- PodDisruptionBudgets
- Cluster topology
- kube-state-metrics
- Previous remediation history

This enables AI agents to make informed decisions using the **live state** of the Kubernetes cluster instead of relying solely on static resource metrics.

---

# 🌟 Why HelmsMan?

Modern Kubernetes platforms provide excellent orchestration capabilities, but operational decisions still require human intervention or rely on simple metric-based autoscaling.

HelmsMan introduces a new paradigm: **policy-aware autonomous remediation**, where AI agents collaborate to optimize infrastructure while a deterministic safety engine guarantees that Kubernetes availability policies are never violated.

---

## 📊 Comparison

| Traditional Kubernetes Operations | ⚓ HelmsMan |
|----------------------------------|------------|
| CPU / Memory Threshold Autoscaling | Multi-Agent AI Decision Making |
| Reactive Monitoring | Autonomous Remediation |
| Manual Infrastructure Decisions | Intelligent Cost Optimization |
| No Operational Reasoning | Live Cluster State Reasoning |
| Safety Depends on Operators | Deterministic Safety Engine |
| No Agent Collaboration | Multi-Agent Negotiation |
| Limited Auditability | Complete Audit Trail |
| Metrics-Only Decisions | Metrics + Kubernetes Policies |

---

# 🛡️ Safety by Design

HelmsMan follows a **"Trust, but Verify"** philosophy.

AI agents can propose infrastructure changes, but **they never communicate directly with Kubernetes**.

Every action is routed through the MCP server where the Safety Engine validates:

- Deployment status
- Replica count
- PodDisruptionBudget constraints
- Minimum available replicas
- Cluster health
- Kubernetes API responses

Only validated operations are executed.

This architecture ensures that **availability is enforced programmatically instead of relying solely on AI reasoning**.

---

# 🔐 Safety Guarantees

Every remediation request undergoes:

- ✅ Live Kubernetes API validation
- ✅ PodDisruptionBudget enforcement
- ✅ Replica safety verification
- ✅ Deployment health checks
- ✅ Complete audit logging

If any policy would be violated, the operation is automatically rejected before reaching Kubernetes.


---

# 🔮 Future Roadmap

HelmsMan is designed to evolve into a comprehensive autonomous cloud operations platform.

### ☸️ Kubernetes

- Horizontal Pod Autoscaler integration
- Vertical Pod Autoscaler integration
- StatefulSet remediation
- DaemonSet management
- Multi-cluster federation
- Cluster autoscaler integration

---

### 🤖 AI & Automation

- Predictive scaling using historical metrics
- AI-generated remediation plans
- Incident root-cause analysis
- Autonomous rollback recommendations
- Self-learning optimization strategies

---

### 🚀 DevOps

- ArgoCD integration
- GitOps workflows
- Prometheus AlertManager integration
- Grafana dashboards
- Slack notifications
- Microsoft Teams integration

---

### 🔒 Security

- RBAC-aware AI agents
- OPA / Gatekeeper integration
- Compliance-aware remediation
- Policy-driven authorization
- Fine-grained access control

---

# 🏆 Hackathon Highlights

- ✅ Native **NitroStack MCP SDK** implementation
- ✅ Full **Model Context Protocol (MCP)** support
- ✅ Live Kubernetes API integration
- ✅ Multi-Agent AI negotiation
- ✅ Deterministic Safety Engine
- ✅ PodDisruptionBudget-aware remediation
- ✅ Observable infrastructure state
- ✅ Complete remediation audit trail

---

# 🤝 Contributing

Contributions are welcome!

If you'd like to improve HelmsMan:

1. Fork the repository

2. Create a feature branch

```bash
git checkout -b feature/my-feature
```

3. Commit your changes

```bash
git commit -m "Add awesome feature"
```

4. Push your branch

```bash
git push origin feature/my-feature
```

5. Open a Pull Request 🚀

---

# 📚 References

- Kubernetes Documentation
- Model Context Protocol (MCP)
- NitroStack MCP SDK
- PodDisruptionBudget (PDB)
- kube-state-metrics
- Kubernetes Client SDK
- kind (Kubernetes in Docker)


---

# 📄 License

This project is licensed under the **MIT License**.

See the `LICENSE` file for more information.

---


# ⭐ Support

If you found HelmsMan useful:

- ⭐ Star this repository
- 🍴 Fork the project
- 🛠️ Contribute improvements
- 🐞 Report issues
- 💡 Share ideas and feedback

---

<p align="center">


## ⚓ HelmsMan

**Autonomous Kubernetes Remediation using the Model Context Protocol**

Built with ❤️ for the **NitroStack MCP Hackathon**

</p>
