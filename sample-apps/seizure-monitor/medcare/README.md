# Family MedCare Ecosystem

A multi-agent MCP server for caregivers managing multi-generational families.
Built on [NitroStack](https://nitrostack.ai) — connects to ChatGPT, Claude, and
any MCP-compatible AI client.

## What It Does

Three AI agents work together to provide comprehensive family healthcare support:

### 🧠 Agent 1 — Health Memory
Manages patient profiles and lab data for the entire family.

| Tool | Description |
|------|-------------|
| `extract_health_data` | Parses lab report text into structured timeline entries |
| `update_health_memory` | Persists extracted lab results into a patient's health profile |

**Resources:** `health://patient-profiles`, `health://patient-profile/{patient_id}`

### 💊 Agent 2 — Medication Safety & Authenticity
Pharmacogenomics-aware drug safety checks and FDA verification.

| Tool | Description |
|------|-------------|
| `check_drug_safety` | Cross-references a drug against genetic markers + active prescriptions |
| `lookup_drug_label` | Fetches official FDA drug label (warnings, contraindications, interactions) |
| `verify_medication_authenticity` | Verifies medication via openFDA NDC + recall + counterfeit registry |

**Resources:** `medication://pharmacogenomics`, `medication://counterfeit-batches`

### 🚨 Agent 3 — Emergency & Family Hub
Critical care summaries and weekly briefings for caregivers.

| Tool | Description |
|------|-------------|
| `generate_emergency_card` | Quick-glance critical care card for emergency responders |

**Prompts:** `caregiver_briefing` — weekly health briefing for the primary caregiver

## Family Profiles

The system includes three sample patients from the Krishnamurthy family:

- **P001 — Arthur** (Grandfather, 74): Diabetes, Hypertension, Atrial Fibrillation, CKD Stage 2. CYP2C19 Poor Metabolizer. On Warfarin.
- **P002 — Mary** (Mother, 45): Hypothyroidism, Asthma. CYP2D6 Intermediate Metabolizer.
- **P003 — Priya** (Child, 12): Healthy. TPMT Intermediate Activity. Severe Penicillin allergy.

## Quick Start

```bash
npm install
npm run dev
```

## Deploy to NitroStack Cloud

```bash
npx nitrostack-cli deploy
```

## Project Structure

```
src/
├── index.ts                    # Entry point
├── app.module.ts               # Root module
├── shared/                     # Shared types & utilities
│   ├── shared.types.ts
│   └── resource-loader.ts
├── health/                     # System health check
├── modules/
│   ├── health/                 # Agent 1: Health Memory
│   ├── medication/             # Agent 2: Medication Safety
│   └── emergency/              # Agent 3: Emergency Hub
├── widgets/                    # Next.js widget UI components
resources/
├── patient_profile.json        # Family patient database
├── pharmacogenomics_db.json    # Gene-drug conflict database
└── reported_counterfeit_batches.json
```

## Team

Built by **Arwindh, Siddharth, Raghav & Sridharan**

## Links

- [NitroStack Docs](https://docs.nitrostack.ai)
- [NitroStudio](https://nitrostack.ai/studio)
- [Discord](https://discord.gg/uVWey6UhuD)
