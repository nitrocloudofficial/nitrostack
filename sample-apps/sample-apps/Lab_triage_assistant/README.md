# Lab Report Triage Assistant 🩺

An intelligent, patient-centric Medical Context Protocol (MCP) server built with the official **NitroStack TypeScript SDK** for the **NitroStack × Amrita University Hackathon** (Healthtech Track).

The **Lab Report Triage Assistant** empowers patients in low-resource settings to paste in raw laboratory report text and receive an instantaneous, plain-language triage assessment — identifying abnormal values, urgency levels, and specialist routing recommendations without requiring complex medical jargon.

---

## 🌟 Features & Capabilities

- 📄 **Raw Lab Report Parsing (`parse_labs`)**: Extracts test names, numeric values, and units from unstructured laboratory reports, supporting alias resolution (e.g., `Hb` → `Hemoglobin`, `SGPT` → `ALT`, `FBS` → `Fasting Glucose`).
- ⚠️ **Critical Flagging & Clinical Triage (`flag_critical`)**: Evaluates parsed test results against standardized reference ranges to categorize each parameter as **NORMAL**, **BORDERLINE**, or **CRITICAL**, determining overall case urgency.
- 👨‍⚕️ **Specialist Routing Engine (`route_specialist`)**: Intelligently groups abnormal parameters by relevant medical domain (e.g., CBC → Hematologist, KFT → Nephrologist, LFT → Hepatologist, Lipids/Glucose/Thyroid → Cardiologist/Endocrinologist) and assigns urgency (*SEE TODAY* vs. *ROUTINE FOLLOW-UP*).
- 💬 **Patient-Centric Explanation Prompt (`explain_triage`)**: Generates calm, empathetic, non-diagnostic explanations aimed at reassuring patients while reinforcing the need for professional medical follow-up.
- 📊 **Inspectable MCP Reference Ranges Resource (`labs://reference-ranges`)**: Exposes clinical reference range datasets as an MCP resource inspectable directly within MCP hosts like NitroStudio.
- 🎨 **Interactive Triage Panel Widget (`triage-panel`)**: A React widget attached to `flag_critical` featuring color-coded alert banners, detailed test breakdown tables, and live frontend tool-chaining (`callTool('route_specialist', ...)`) directly inside the widget interface.

---

## 🏗️ Architecture & Component Design

The application follows a modular architecture built using `@nitrostack/core` decoratored modules, tools, resources, prompts, and widgets.

```
                  ┌─────────────────────────────────────┐
                  │          Raw Lab Report             │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │     parse_labs      │ (Tool)
                          └──────────┬──────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │    flag_critical    │ (Tool)
                          └──────────┬──────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    ┌───────────────────────────┐           ┌───────────────────────────┐
    │       triage-panel        │ (Widget)  │   labs://reference-ranges │ (Resource)
    │ (Includes callTool for    │           └───────────────────────────┘
    │  route_specialist)        │
    └────────────┬──────────────┘
                 │
                 ▼
    ┌───────────────────────────┐
    │     explain_triage        │ (Prompt)
    └───────────────────────────┘
```

### Module Registration (`src/modules/lab/lab.module.ts`)
- **Tools**: `ParseLabsTool`, `FlagCriticalTool`, `RouteSpecialistTool`
- **Resources**: `ReferenceRangesResource`
- **Prompts**: `ExplainTriagePrompt`

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher

### 1. Installation
Clone the repository and install all dependencies (server + widgets):

```bash
git clone https://github.com/Dhakshin16/lab-report-triage.git
cd lab-report-triage
npm run install:all
```

### 2. Environment Configuration
Copy the example environment file if customization is required:

```bash
cp .env.example .env
```
*Note: No secret keys or environment variables are required for basic execution; all clinical logic and reference datasets run locally on the server.*

### 3. Run Development Mode
Start both the MCP STDIO server and the Next.js widget development server (port `3001`):

```bash
npm run dev
```

---

## 🧪 Testing with NitroStudio

NitroStudio is the recommended visual client for testing and verifying tools, resources, and interactive widgets.

1. Download & open **[NitroStudio](https://nitrostack.ai/studio)**.
2. Click **Add Server** → select **Nitro Project** tab.
3. Browse to the root directory of this repository and click **Open Project**.
4. Select **Studio App Canvas** mode (NitroStudio manages spawning the dev server automatically).

### Test Workflow in Studio

1. **Test `parse_labs`**:
   - In the left sidebar, navigate to **Tools** → **parse_labs**.
   - Input sample raw text:
     ```json
     {
       "text": "Hemoglobin: 9.5 g/dL\nFasting Glucose: 250 mg/dL\nSerum Creatinine: 2.8 mg/dL"
     }
     ```
   - Click **Execute Tool** to review extracted structured tests.

2. **Test `flag_critical` & Interactive Widget**:
   - Navigate to **Tools** → **flag_critical**.
   - Pass parsed tests:
     ```json
     {
       "tests": [
         { "testName": "Hemoglobin", "value": 9.5, "unit": "g/dL" },
         { "testName": "Fasting Glucose", "value": 250, "unit": "mg/dL" },
         { "testName": "Serum Creatinine", "value": 2.8, "unit": "mg/dL" }
       ]
     }
     ```
   - Click **Execute Tool**. Observe the **Widget Preview** rendering the `triage-panel` with:
     - 🚨 **Red/Amber Critical Banner**
     - 📋 **Parameter Classification Table**
     - 🩺 **Specialist Routing Card** (dynamically populated via live frontend `callTool('route_specialist', ...)` invocation).

3. **Inspect Resources**:
   - In the left sidebar, navigate to **Resources** → `labs://reference-ranges`.
   - Read the resource to inspect the raw clinical threshold data.

4. **Execute Prompts**:
   - Navigate to **Prompts** → `explain_triage` to render plain-language patient reassurance templates.

---

## 📦 Production Build & Deployment

### Build Locally
To test compiling production binaries and widget bundles:

```bash
npm run build
```

Output:
- Built server bundle in `dist/`
- Bundled widget static files in `src/widgets/out/`

### Start Production Server
```bash
npm start
```

### Deploy to NitroStack Cloud
Deploy your MCP server to NitroStack Cloud using the NitroStack CLI:

```bash
npx @nitrostack/cli deploy
```

---

## 🛠️ Tech Stack & Dependencies

- **Framework**: [NitroStack SDK](https://nitrostack.ai) (`@nitrostack/core`, `@nitrostack/widgets`, `@nitrostack/cli`)
- **Language**: TypeScript (ESNext target, Strict mode)
- **Frontend / Widgets**: Next.js 14, React 18, Tailwind CSS
- **Protocol**: Model Context Protocol (MCP STDIO / HTTP App Canvas)

---

## 📜 Disclaimer

*This tool is developed strictly for educational and hackathon demonstration purposes as part of the NitroStack × Amrita University Hackathon. It is not a certified medical device and does not provide medical diagnoses or replace professional clinical judgment. Always consult a qualified healthcare provider for medical evaluation.*

---

## 📄 License

MIT License. Developed for the NitroStack × Amrita University Hackathon.
