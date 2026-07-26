**CareVault AI MCP Server**

A role-based digital health assistant built as a Model Context Protocol (MCP) server for the Amrita University MCP Hackathon 2026 — HealthTech & Life Sciences track.

CareVault AI lets patients, doctors, lab assistants, and hospitals interact with health records, appointments, lab reports, and consent-gated data sharing through natural language, via any MCP-compatible AI client (NitroStack Studio AI Chat, ChatGPT, etc.).

**Project Overview**

CareVault AI is a single MCP server that unifies core hospital and patient workflows behind one conversational interface. It was built to demonstrate how Agentic AI + MCP can replace fragmented, siloed healthcare portals with one consent-driven, role-aware assistant.

Problem it solves: Patients juggle multiple hospital portals, paper reports, and phone calls just to check a wait time or share a scan with a new doctor. Hospitals, meanwhile, have no standard way to request access to a patient's history without violating their privacy.

**Core capabilities:**

Patients can view appointments, lab reports, and medicines, and control exactly which hospitals can see their history.
A senior citizen patient can assign a nominee, whose blood group is verified (mock Aadhaar check) before they're granted proxy access.
Uploading a critical medical report automatically notifies both the patient and their doctor.
Hospitals push live wait-time updates that patients can query in real time.
All data access is enforced by role (patient, doctor, lab_assistant) and by explicit patient consent — a hospital can only see a patient's record if that patient has approved it, and vice versa.

Why it matters: This pattern — role-based access + consent gating + critical-alert routing — generalizes to any regulated data domain, not just healthcare, and shows a production-realistic use of MCP tools, resources, and prompts together.

**Installation Steps**
Prerequisites
Node.js 20.x (18+ minimum) — check with node -v
npm (ships with Node) — check with npm -v
Git
Clone and install
bash
git clone https://github.com/<your-org>/carevault-ai-mcp.git
cd carevault-ai-mcp
npm install
Run locally
bash
npm run dev

This starts the MCP server and the widget dev server (default port 3001). NitroStack Studio will auto-run npx tsx src/index.ts and auto-install dependencies if you connect the project via Add Server → Nitro Project instead of the CLI.

Production build
bash
npm run build
npm run start:prod
Environment Setup

Copy the example env file and fill in your own values — never commit your actual .env file.

bash
cp .env.example .env
Variable	Description	Required
PORT	Port for the MCP HTTP server (default 8080)	No
NITRO_APP_ID	NitroCloud app ID (from the app's Overview page)	Yes, for cloud deploy
MOCK_AADHAAR_SEED	Seed value used by the mock Aadhaar/blood-group verification function	No
LOG_LEVEL	info | warn | error | debug	No

No real Aadhaar, hospital, or patient database credentials are used in this project — all patient, lab, and hospital data is mock/fixture data stored under fixtures/. This is intentional: real Aadhaar/UIDAI integration requires government authorization and is out of scope for a hackathon build.

**Architecture**
carevault-ai-mcp/
├── src/
│   ├── index.ts                # Bootstrap entry point
│   ├── app.module.ts           # Root module — registers all sub-modules
│   ├── modules/
│   │   ├── auth/                     # authenticatePatient, role checks
│   │   ├── appointments/              # book/reschedule/cancel/list
│   │   ├── records/                   # lab reports, medical history, radiology
│   │   ├── nominee/                   # assignNominee, verifyNomineeBloodGroup
│   │   ├── notifications/             # critical report alerts, reminders
│   │   ├── hospital/                  # wait-time updates, hospital-side queries
│   │   └── consent/                   # request/grant/revoke hospital access
│   ├── health/                  # health check endpoints
│   └── widgets/                 # React widgets (appointments cards, lab report view)
├── fixtures/                    # mock patients, hospitals, reports, consents
├── package.json
└── tsconfig.json
Role-based access flow
Request → authenticatePatient/authenticateStaff
        → resolve role (patient | doctor | lab_assistant)
        → check consent (hasConsent(hospitalId, patientId)) for hospital-facing reads
        → check nominee verification (if caller is a nominee, not the patient)
        → execute tool
        → log action (audit trail)
Key design decisions
Tools handle all actions (book appointment, upload report, update wait time).
Resources expose read-only structured data (e.g. access://{patientId}/consents, patient://{patientId}/profile).
Prompts standardize interactions that need consistent framing, e.g. explain-lab-report, which always avoids diagnosis and recommends professional consultation.
Every read of patient data by a non-patient role passes through a single consent-check function, rather than being duplicated per tool — this keeps the access-control logic auditable in one place.
Usage Instructions
In NitroStack Studio
Connect the project via Add Server → Nitro Project, or run npm run dev and connect via HTTP.
Go to Tools in the sidebar to test individual tools (e.g. authenticatePatient, getLabReports) with sample inputs.
Go to AI Chat to interact conversationally — e.g. ask "Show me my upcoming appointments" or "Share my MRI scan with PSG Hospital."
Use Logs to inspect tool calls and confirm consent checks are firing correctly.
Example interactions
You ask	What happens
"Book me an appointment with Dr. Arun tomorrow at 10 AM"	Authenticates → checks doctor availability → books → sends reminder
"Show my latest blood report"	Authenticates → fetches lab report → explains it in plain language (no diagnosis)
"Share my MRI with PSG Hospital"	Authenticates → checks/grants consent → shares record
(as hospital) "Get patient 104's history"	Checks consent — returns data only if patient has approved; otherwise returns an explicit access-denied message
(as lab assistant) "Upload critical X-ray report for patient 104"	Stores report → automatically alerts both patient and assigned doctor
Deploying
Push to GitHub (see .gitignore — never commit .env, tokens, or node_modules).
In NitroCloud, connect the repo under Deployments → Connect Repository to enable auto-deploy on every push to main.
Once live, copy the Service URL and connect it to ChatGPT or another MCP client via the {serviceUrl}/sse endpoint.
