# Rampd - AI Onboarding & Offboarding Orchestrator

An end-to-end Model Context Protocol (MCP) server built with **NitroStack** for orchestrating enterprise employee onboarding and offboarding workflows across Identity, Equipment, and Workspace management systems.

---

## 🌟 Overview

**Rampd** automates IT and HR lifecycle management for organizations. Powered by NitroStack, it provides structured MCP tools, resources, and orchestration pipelines to seamlessly onboard new team members or offboard departing employees.

### Key Workflows:
* **Onboarding Pipeline (`onboardEmployee`)**: Sequentially grants identity access → assigns hardware/peripherals → provisions email, Slack channels, and cloud storage based on employee role.
* **Offboarding Pipeline (`offboardEmployee`)**: Gracefully deprovisions workspace access → reclaims assigned equipment → revokes SSO and security tokens in reverse security order.

---

## 🚀 Modules & Capabilities

### 1. 🛡️ Identity Module (`grantIdentity`, `revokeIdentity`, `getIdentityStatus`)
* **Role-Based Provisioning**: Engineers automatically receive SSO + VPN + CodeHost access; other roles receive standard SSO + Email.
* **Audit & Status Tracking**: Live querying of employee system permissions and active identity state.

### 2. 💻 Equipment Module (`assignEquipment`, `reclaimEquipment`, `getEquipmentStatus`)
* **Hardware Kits**: Assigns role-tailored hardware packages (e.g. Engineer bundle: Laptop, 4K Monitor, Peripherals).
* **Asset Tracking**: Reclaims and updates hardware status during offboarding.

### 3. 🌐 Workspace Module (`provisionWorkspace`, `deprovisionWorkspace`, `getWorkspaceStatus`)
* **Communication & Drive**: Configures work email, assigns role-specific Slack channels (`#eng-team`, `#general`), and sets up shared cloud drives.
* **Deprovisioning**: Revokes workspace and channel memberships safely.

### 4. ⚡ Orchestrator Module (`onboardEmployee`, `offboardEmployee`)
* **Unified Workflow Engine**: Single multi-stage tools that coordinate across Identity, Equipment, and Workspace stores with structured execution logs and step summaries.

---

## 🛠️ Getting Started

### Prerequisites
* Node.js v18+
* npm v9+

### Installation & Running

```bash
# Clone repository & navigate to project folder
cd sample-apps/Rampd-AI-Onboarding-Offboarding-Orchestrator

# Install dependencies
npm install

# Start development server with hot-reloading
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

---

## 🧪 Testing with NitroStudio

**NitroStudio** provides a visual environment to interactively test MCP tools and inspect logs:

1. Launch NitroStudio: `npx @nitrostack/cli studio` or visit [NitroStudio](https://nitrostack.ai/studio).
2. Connect to the local server running on `http://localhost:3000`.
3. Call `onboardEmployee` with sample input:
   ```json
   {
     "employeeName": "Alice Johnson",
     "role": "Engineer"
   }
   ```
4. Verify step-by-step logs and output summary.

---

## 📄 License

MIT License. Built for the NitroStack Hackathon.
