# 🛡️ PharmaGuard — AI Medication Safety Copilot

> **NitroStack Hackathon** · HealthTech & Life Sciences Track  
> Multi-factor clinical risk analysis MCP server that prevents dangerous drug prescriptions before they reach the patient.

---

## 📌 Problem Statement

Medical errors kill **~98,000 people annually** in the US alone. Drug-drug interactions, allergy cross-reactivity, renal contraindications, and pregnancy risks are preventable — but doctors juggle hundreds of drug combinations under time pressure.

**PharmaGuard** is an AI-powered MCP server that acts as a **real-time safety net** between the doctor's prescription intent and the patient. It intercepts natural language prescription requests, runs **7 parallel safety checks** across multiple clinical dimensions, and delivers a color-coded risk assessment with actionable alternatives.


## 🏗️ Multi-Agent Architecture


<img width="1693" height="929" alt="Image" src="https://github.com/user-attachments/assets/f6c04a4d-7f30-49a6-bde9-934f973b2ac7" />


---

## 🔄 Complete Tool Orchestration Flow

When a doctor asks about prescribing a medication, the AI agent orchestrates **12 tools** in this sequence:

```
                         Doctor's Natural Language Input
                         "Prescribe Ibuprofen 400mg for P001"
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                                    ▼
          ┌─────────────────┐               ┌──────────────────────┐
  Step 1  │ get_patient_    │   Step 2      │ extract_clinical_    │
          │ profile (P001)  │               │ entities (Gemini)    │
          └────────┬────────┘               └──────────┬───────────┘
                   │                                    │
                   │  Patient Data:                     │  Extracted:
                   │  • Age: 65                         │  • Drug: Ibuprofen
                   │  • Allergies: [Penicillin]         │  • Dose: 400mg
                   │  • Meds: [Lisinopril]              │  • Frequency: TBD
                   │  • CrCl: 45 mL/min                │  • Reason: headache
                   │  • Pregnancy: N/A                  │
                   │                                    │
                   └────────────┬───────────────────────┘
                                │
                   ┌────────────▼────────────┐
          Step 3   │   7 PARALLEL SAFETY     │
                   │   CHECKS (simultaneous) │
                   └────────────┬────────────┘
                                │
           ┌────────┬───────┬───┴───┬────────┬────────┬────────┐
           ▼        ▼       ▼       ▼        ▼        ▼        ▼
      ┌─────────┐┌──────┐┌──────┐┌──────┐┌───────┐┌──────┐┌───────┐
      │Drug-Drug││Allergy││Disease││ Age  ││Duplic.││Renal ││Pregn. │
      │Interact.││Cross- ││Contra││Appro.││Therapy││Dose  ││Safety │
      │(OpenFDA)││React. ││indica.││(Beers)││(RxNorm)││Adj. ││(FDA)  │
      │         ││       ││      ││      ││       ││(CKD) ││Cat.   │
      └────┬────┘└───┬───┘└───┬──┘└───┬──┘└───┬───┘└──┬───┘└───┬───┘
           │         │        │       │       │       │        │
           └─────────┴────────┴───┬───┴───────┴───────┴────────┘
                                  │
                     ┌────────────▼────────────┐
            Step 4   │  aggregate_risk_score   │
                     │  Combines all flags     │
                     │  → safe / caution /     │
                     │    high_risk            │
                     └────────────┬────────────┘
                                  │
                    ┌─────────────┼──────────────┐
                    ▼                             ▼
          ┌─────────────────┐          ┌──────────────────┐
 Step 5   │ find_and_rank_  │ Step 6   │ generate_doctor_ │
 (if risky)│ alternatives   │          │ report           │
          │ (RxNorm + re-  │          │ (Template/Gemini)│
          │  check safety) │          │ + @Widget render │
          └─────────────────┘          └────────┬─────────┘
                                                │
                                   ┌────────────▼────────────┐
                                   │   🛡️ Risk Dashboard     │
                                   │   Widget (Next.js)      │
                                   │                         │
                                   │  🟢 SAFE / 🟡 CAUTION  │
                                   │  🔴 HIGH RISK           │
                                   │                         │
                                   │  Clinical Report +      │
                                   │  Recommended Action     │
                                   └─────────────────────────┘
```

---

## 📦 Project Structure

```
my-server/
├── .env                                # API keys (Gemini)
├── package.json                        # NitroStack + dependencies
├── tsconfig.json                       # TypeScript config
├── README.md                           # This file
├── sample_patient_record.txt           # Demo file for upload testing
│
├── src/
│   ├── index.ts                        # Server bootstrap (@McpApp)
│   ├── app.module.ts                   # Root module → PharmaGuardModule
│   ├── health/
│   │   └── system.health.ts            # Health check endpoint
│   │
│   ├── modules/
│   │   └── pharma-guard/
│   │       ├── pharma-guard.module.ts  # Module — registers all 4 agents
│   │       ├── shared-utils.ts         # Shared: Gemini API, patient store
│   │       ├── pharma-guard.resources.ts # Patient data resources
│   │       ├── pharma-guard.prompts.ts # Workflow prompt templates
│   │       │
│   │       ├── agents/                 # ⭐ Multi-Agent Architecture
│   │       │   ├── patient-agent.tools.ts   # 🏥 Patient Agent (2 tools)
│   │       │   ├── safety-agent.tools.ts    # 🛡️ Safety Agent (9 tools)
│   │       │   ├── ayush-agent.tools.ts     # 🌿 AYUSH Agent (1 tool, India)
│   │       │   └── report-agent.tools.ts    # 📊 Report Agent (2 tools)
│   │       │
│   │       └── data/
│   │           ├── patients.json       # 3 EHR patient profiles + herbal remedies
│   │           └── clinical-tables.ts  # 7 clinical lookup tables + AYUSH DB
│   │
│   └── widgets/
│       ├── widget-manifest.json        # Widget registration
│       ├── next.config.js              # Next.js widget config
│       ├── package.json                # Widget dependencies
│       └── app/
│           ├── layout.tsx              # Widget layout wrapper
│           └── risk-dashboard/
│               └── page.tsx            # Risk Dashboard widget (React)
```

---

## 🔧 All 15 MCP Tools

### Tier 1 — Core Safety Pipeline

| # | Tool | Input | Output | Data Source | Citation |
|---|------|-------|--------|-------------|----------|
| 1 | `get_patient_profile` | `patientId` | Full clinical profile (demographics, labs, meds, allergies, **herbal remedies**) | `patients.json` + in-memory store | Patient EHR |
| 2 | `extract_clinical_entities` | Natural language text | Structured JSON: `{drugName, dosage, frequency, reason}` | **Gemini LLM** (+ regex fallback) | — |
| 3 | `check_drug_drug_interaction` | `newDrug` + `currentMedications[]` | Interaction list with severity + clinical context | **OpenFDA API** + local fallback table | OpenFDA Drug Label DB |
| 4 | `check_drug_allergy_conflict` | `newDrug` + `allergies[]` | Direct match + cross-reactivity check | Allergy cross-reactivity table | Immunology & Allergy Clinics of North America |
| 5 | `check_disease_conflict` | `newDrug` + `diagnoses[]` | Contraindication flags with detail | Contraindication table | FDA Drug Label; Clinical Pharmacology Guidelines |
| 6 | `check_age_appropriateness` | `newDrug` + `patientAge` | Beers Criteria flags for elderly/pediatric | Rule-based thresholds | **AGS Beers Criteria® (2023 Update)** |
| 7 | `aggregate_risk_score` | All check results | `{overallRisk, riskScore, flaggedChecks[]}` | Weighted scoring algorithm | — |
| 8 | `generate_doctor_report` | Patient + risk data | Professional clinical report with **[Source]** tags | **Gemini LLM** (+ template fallback) | All citations aggregated |

### Tier 2 — Advanced Checks

| # | Tool | Input | Output | Data Source | Citation |
|---|------|-------|--------|-------------|----------|
| 9 | `check_duplicate_therapy` | `newDrug` + `currentMeds[]` | Same-class detection | **RxNorm API** + local table | NIH RxNorm Drug Classification API |
| 10 | `check_renal_dose_adjustment` | `newDrug` + `creatinineClearance` | CKD staging (1-5) + dose adjustment | Rule-based CKD thresholds | **KDIGO Clinical Practice Guidelines (2024)** |
| 11 | `find_and_rank_alternatives` | `unsafeDrug` + `patientId` | Ranked alternatives with safety scores | **RxNorm API** + safety re-check | — |

### Tier 3 — Specialized & India-Localized 🇮🇳

| # | Tool | Input | Output | Data Source | Citation |
|---|------|-------|--------|-------------|----------|
| 12 | `check_pregnancy_safety` | `newDrug` + `pregnancyStatus` | FDA Category (A/B/C/D/X) | FDA pregnancy category table | **FDA Pregnancy Risk Categories; Briggs 12th Ed** |
| 13 | **`check_ayush_interaction`** 🌿 | `newDrug` + `herbalRemedies[]` | Herb-drug interaction flags with citations | **AYUSH Interaction DB** (12 entries) | Indian Journal of Pharmacology; AYUSH Ministry |
| 14 | `ingest_patient_record` | File upload (.txt/.csv/.pdf/.docx) or raw text | Structured patient JSON | **Gemini LLM** + regex fallback | — |

---

## 🌿 AYUSH Herb-Drug Interaction System (India-Localized)

> *"Standard APIs only protect patients in the West. We localized our MCP agent to protect Indian patients who frequently mix Allopathic and Ayurvedic treatments."*

PharmaGuard includes a **custom AYUSH interaction database** that cross-references Western (Allopathic) drugs against common Indian herbal remedies — **a gap that OpenFDA, RxNorm, and all Western drug databases leave unaddressed.**

### Covered Herbs & Key Interactions

| Herb | Interacting Drugs | Severity | Effect |
|------|-------------------|----------|--------|
| 🌿 **Ashwagandha** | Diazepam, Levothyroxine, Metformin | Major/Moderate | Sedation, thyroid storm, hypoglycemia |
| 🌿 **Triphala** | Warfarin, Metformin | Major/Moderate | Bleeding risk, hypoglycemia |
| 🌿 **Guggul** | Warfarin, Atorvastatin | Major/Moderate | Reduced anticoagulation, liver stress |
| 🌿 **Tulsi** | Aspirin, Diazepam | Moderate | Bleeding risk, excessive sedation |
| 🌿 **Brahmi** | Donepezil | Moderate | Cholinergic overload |
| 🌿 **Arjuna** | Atenolol | Moderate | Bradycardia |
| 🌿 **Neem** | Metformin | Moderate | Hypoglycemia |

Each interaction includes **mechanism of action**, **clinical recommendation**, and **published citation** for full doctor trust.

---

## 📑 Source Citations & Explainable AI

Every safety flag in PharmaGuard includes a **citation** tracing back to the exact data source. This makes the system fully transparent and trustworthy for doctors.

| Check Type | Citation Source |
|-----------|---------------|
| Drug-Drug Interaction | U.S. FDA Drug Label Database (OpenFDA) |
| Allergy Cross-Reactivity | Immunology & Allergy Clinics of North America |
| Disease Contraindication | FDA Drug Label; Clinical Pharmacology & Therapeutics Guidelines |
| Age Appropriateness | **AGS Beers Criteria® (American Geriatrics Society, 2023)** |
| Renal Dose Adjustment | **KDIGO Clinical Practice Guidelines (2024)** |
| Duplicate Therapy | NIH RxNorm Drug Classification API |
| Pregnancy Safety | **FDA Pregnancy Risk Categories; Briggs, Freeman & Yaffe 12th Ed** |
| AYUSH Herb-Drug | Indian Journal of Pharmacology; AYUSH Ministry; JAIM; CCRAS |

---

## 📊 Clinical Data Tables

| Table | Purpose | Entries |
|-------|---------|--------|
| `ALLERGY_CROSS_REACTIVITY_TABLE` | Maps drugs to allergy classes they trigger | 11 drugs |
| `CONTRAINDICATION_TABLE` | Maps drugs to diseases they conflict with | 10 drugs |
| `DRUG_INTERACTION_FALLBACK_TABLE` | Drug pair interactions (when OpenFDA is unavailable) | 8 drug pairs |
| `PREGNANCY_CATEGORY_TABLE` | FDA risk categories A through X | 12 drugs |
| `LOCAL_DRUG_CLASSES` | Therapeutic class groupings (RxNorm fallback) | 17 drugs |
| `ALTERNATIVE_DRUGS` | Safer replacement suggestions per drug | 9 drugs |
| **`AYUSH_INTERACTION_TABLE`** 🌿 | Ayurvedic herb × Allopathic drug interactions | **12 interactions** |

---

## 👥 Demo Patients & Expected Scenarios

### P001 — Mr. Sharma (Male, Age 65)
- **Profile:** Hypertension, allergy to Penicillin, on Lisinopril, CrCl 45 mL/min
- **Demo:** "Prescribe Ibuprofen 400mg for headache"
- **Expected Flags:**
  - 🔴 Drug-drug interaction (MAJOR): Ibuprofen + Lisinopril
  - 🔴 Renal: CrCl 45 = CKD Stage 3, Ibuprofen is nephrotoxic
  - 🟡 Elderly: Age 65, Beers Criteria flag
- **Recommended Alternative:** Acetaminophen (passes all checks)

### P002 — Ms. Fernandez (Female, Age 29)
- **Profile:** Pregnant (trimester 2), Migraine, allergy to Sulfa drugs, no current meds
- **Demo:** "Prescribe Ibuprofen for migraine"
- **Expected Flags:**
  - 🔴 Pregnancy: Ibuprofen = FDA Category D (contraindicated)
- **Recommended Alternative:** Acetaminophen (Category B, safe in pregnancy)

### P003 — Mr. Rao (Male, Age 80)
- **Profile:** CKD Stage 3, Atrial Fibrillation, Type 2 Diabetes, on Warfarin + Metoprolol + Metformin, CrCl 22 mL/min
- **Demo:** "Prescribe Aspirin 325mg for blood clot prevention"
- **Expected Flags:**
  - 🔴 Drug-drug interaction: Aspirin + Warfarin (major bleeding risk)
  - 🔴 Duplicate therapy: both are antithrombotics
  - 🔴 Disease conflict: Aspirin + CKD Stage 3
  - 🔴 Renal: CrCl 22 = CKD Stage 4, Aspirin is nephrotoxic
  - 🟡 Elderly: Age 80

---

## 🌐 External API Integration

| API | Purpose | Auth Required | Rate Limit |
|-----|---------|--------------|------------|
| **Google Gemini** (`v1beta`) | Entity extraction + report generation | API Key (in `.env`) | Free tier available |
| **OpenFDA** Drug Label | Drug-drug interaction lookup | None (public) | 240 requests/min |
| **RxNorm** (NIH) | Drug classification + alternative lookup | None (public) | No formal limit |

All APIs have **local fallback tables** so the system works fully offline.

---

## 🎨 Widget System (2 Widgets)

### Widget 1: Risk Dashboard (`/risk-dashboard`)
Renders inline in NitroStack Studio when `generate_doctor_report` is called:

- **🟢 Green banner** — SAFE TO PRESCRIBE
- **🟡 Yellow banner** — PROCEED WITH CAUTION
- **🔴 Red banner** — HIGH RISK — REVIEW REQUIRED

### Widget 2: 🧠 AI Thinking Trace (`/agent-trace`) — Explainable AI
Renders inline when `aggregate_risk_score` is called. Shows an **animated step-by-step visualization** of the AI's multi-agent decision pipeline:

- Each tool call appears as an animated block (staggered 400ms entrance)
- **Color-coded by agent**: 🏥 Purple (Patient) · 🛡️ Blue (Safety) · 🌿 Green (AYUSH) · 📊 Amber (Report)
- Each block shows: tool name, agent name, pass/fail status, detail, and source citation
- Judges see EXACTLY what the AI checked and why — **zero black box**

<img width="1804" height="872" alt="Image" src="https://github.com/user-attachments/assets/9dc4a676-238c-462e-9be7-442a97f2d22a" />

Both widgets use `@nitrostack/widgets` SDK:
- `useWidgetSDK()` — Access tool output data
- `useTheme()` — Dark/light mode support
- `useWidgetState()` — Persistent expand/collapse state

---

## 🚀 Quick Start

```bash
# Navigate to my-server directory
cd my-server

# Install dependencies
npm install

# Set your Gemini API key in .env
echo "GEMINI_API_KEY=your_key_here" > .env

# Start development server
npm run dev
```

Then open **NitroStack Studio** → point to this project → try:
> "Can I prescribe Ibuprofen 400mg for patient P001's headache?"

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------| 
| **Framework** | NitroStack (`@nitrostack/core`) — Decorator-based MCP |
| **Architecture** | Multi-Agent (4 specialized agents) |
| **Language** | TypeScript (strict mode, ESM) |
| **LLM** | Google Gemini 2.0 Flash (entity extraction + reports) |
| **Drug Interactions** | OpenFDA `/drug/label` API |
| **Drug Classification** | RxNorm REST API (NIH, free, no key required) |
| **AYUSH Database** | Custom herb-drug interaction table (12 entries) |
| **Validation** | Zod schemas on every tool input |
| **Widgets** | Next.js 14 + `@nitrostack/widgets` SDK (2 widgets) |
| **Transport** | STDIO (dev) / STDIO + HTTP SSE (production) |

---

## 📁 Key Design Decisions

1. **Multi-Agent Architecture**: 15 tools split into 4 specialized agents (Patient, Safety, AYUSH, Report). Reduces LLM context overhead and enables independent scaling.

2. **Rule-based + LLM hybrid**: Clinical safety checks use deterministic rule-based logic (no hallucination risk). LLM is only used for natural language understanding and report formatting.

3. **Graceful degradation**: Every external API call (Gemini, OpenFDA, RxNorm) has a local fallback table. System works fully offline.

4. **Explainable AI**: Every safety flag includes a source citation. The Agent Trace widget visualizes the entire decision pipeline — zero black box.

5. **India-localized AYUSH Agent**: Covers Ayurvedic herb × Allopathic drug interactions that no Western API tracks — critical for Indian patients.

6. **Parallel execution**: All 8 safety checks (including AYUSH) run simultaneously, then aggregate. No sequential bottleneck.

7. **Re-check alternatives**: `find_and_rank_alternatives` doesn't just suggest drugs — it re-runs ALL safety checks on each candidate and ranks by score.

8. **File Upload Ingestion**: Patients can be loaded from .txt, .csv, .pdf, .docx files — Gemini LLM extracts structured profiles with regex fallback.

---

## 📄 License

Built for the NitroStack Hackathon 2026.
