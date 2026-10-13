# 🏥 AetherCare — Agentic MoE Healthcare Navigator

> **NitroStack × Amrita University Hackathon 2026 Submission**  
> Built with **NitroStack TypeScript SDK** (`@nitrostack/core`, `@nitrostack/cli`) & **Model Context Protocol (MCP)**.

---

## 🌟 Executive Summary

**AetherCare** is an AI-powered, decentralized Agentic Healthcare Navigator designed for common citizens, clinics, and insurance auditors in India. It directly solves the systemic **information asymmetry** in public healthcare by connecting LLMs to live healthcare intelligence:
- **Unannounced Hospital Blacklisting & Empanelment Shifts**: Real-time cashless network status across PM-JAY, CGHS, and major TPAs.
- **Illegal Cash Demands & Price Cap Violations**: Statutory price ceiling verification for medical devices (coronary stents, knee replacements) and daily ICU packages under National Pharmaceutical Pricing Authority (NPPA) & National Health Authority (NHA) regulations.
- **Dynamic Paperwork & Scheme Rules**: Instant eligibility checks and dynamic pre-authorization document checklists for Ayushman Bharat (PM-JAY) and State health schemes.

---

## 🛠️ System Architecture

AetherCare is implemented as a high-performance MCP server modularized with the **NitroStack Framework**:

```
aethercare-mcp/
├── src/
│   ├── app.module.ts              # Root NitroStack App Module
│   ├── index.ts                   # Transport & Bootstrap entry (STDIO + SSE)
│   ├── modules/
│   │   ├── aethercare/            # Core Healthcare Intelligence Module
│   │   │   ├── aethercare.module.ts
│   │   │   ├── aethercare.tools.ts    # 5 MCP Tools
│   │   │   ├── aethercare.resources.ts# 2 MCP Knowledge Resources
│   │   │   └── aethercare.prompts.ts  # 2 MCP Interactive Prompts
│   │   └── calculator/            # Scaffolding Demo Module
│   ├── health/                    # NitroStack Health Check Controllers
│   └── widgets/                   # Next.js Interactive UI Widgets
│       ├── app/
│       │   ├── empanelment-card/  # Visual Hospital Empanelment Radar Card
│       │   ├── price-cap-audit/   # Side-by-Side NPPA Price Audit Badge
│       │   └── document-checklist/# Admission Paperwork Checklist Widget
│       └── widget-manifest.json   # Widget registry
├── package.json
└── tsconfig.json
```

---

## 🧰 MCP Features Reference

### 1. Core Tools (`aethercare.tools.ts`)
* 🏥 `check_hospital_empanelment`: Search hospitals by name, city, or pincode to check empanelment, cashless eligibility, ICU bed availability, and fraud warning alerts. *(Renders `empanelment-card` widget)*
* ⚖️ `verify_procedure_price_cap`: Queries legal price ceilings (e.g. DES Cardiac Stent ₹38,260 cap, Knee Replacement ₹64,180 cap) under NPPA Orders. *(Renders `price-cap-audit` widget)*
* 📋 `check_scheme_eligibility_and_docs`: Evaluates patient income, caste, state, and ration card status to generate an instant pre-authorization checklist. *(Renders `document-checklist` widget)*
* 🚨 `analyze_billing_fraud_risk`: B2B and B2C automated bill auditing tool that compares hospital line-items against statutory price ceilings to detect illegal cash demands. *(Renders `price-cap-audit` widget)*
* 📰 `search_healthcare_announcements`: Scans real-time government circulars and scheme policy changes.

### 2. Knowledge Resources (`aethercare.resources.ts`)
* `aethercare://schemes/pmjay_master`: Master guidelines for PM-JAY entitlement, ₹5 Lakh family floater rules, and helpline numbers.
* `aethercare://regulations/price_caps`: Benchmark database for national price-capped medical devices and procedures under DPCO 2013.

### 3. Interactive Workflows & Prompts (`aethercare.prompts.ts`)
* `patient_intake_triage`: Step-by-step assistant guiding distressed patients during emergency hospital intake.
* `claim_audit_assistant`: Interactive claim auditing prompt for clinics and insurers.

### 4. Interactive UI Widgets (`src/widgets/`)
* **Hospital Empanelment Radar (`/empanelment-card`)**: High-contrast, responsive visual card displaying empanelment status, cashless network badges, and fraud warning banners.
* **Price Cap Audit Badge (`/price-cap-audit`)**: Side-by-side comparison of hospital estimate vs. legal ceiling with pass/warning/fraud risk badges.
* **Admission Paperwork Checklist (`/document-checklist`)**: Interactive document tracker for patient admissions under PM-JAY.

---

## 🚀 Environment Setup & Installation

### Prerequisites
- **Node.js**: `v18.0.0` or higher (Recommended: `v20.x` or `v24.x`)
- **npm** or **pnpm**
- **NitroStack Studio** (Desktop IDE for testing & debugging MCP servers)

### Installation
```bash
# 1. Clone or navigate to project directory
cd aethercare-mcp

# 2. Install dependencies
npm install

# 3. Build project & widgets
npm run build
```

---

## 💻 Development & Testing

### Running Locally with NitroStack CLI
```bash
# Run NitroStack Dev Server with hot reloading
npm run dev
```

### Testing with NitroStack Studio
1. Launch **NitroStack Studio**.
2. Click **Add Server** → Select **Nitro Project** tab.
3. Select `aethercare-mcp` folder and click **Open Project**.
4. Choose **Studio App Canvas** or **Vibe Code (Compose)** to test tools, inspect widget previews, and test prompts.

---

## ☁️ Deployment to NitroCloud

1. Push your repository to **GitHub**.
2. Log in to [NitroCloud Dashboard](https://nitrocloud.ai).
3. Connect your GitHub repository under **Deployments** → Select branch `main`.
4. Click **Deploy**. NitroCloud will auto-build and stream build logs to provide your live production **Service URL** (`https://.../sse`).

---

## 📄 License & Compliance
This project strictly complies with the **NitroStack Hackathon 2026 Guidelines**, utilizing only the official **NitroStack TypeScript SDK** (`@nitrostack/core`). Built responsibly with AI assist.
