# CivicFix AI - Smart City Civic Complaint Management Platform

**CivicFix AI** is an AI-powered full-stack Smart City Civic Complaint Management Platform. Citizens report civic issues anonymously via photo, voice, or text in any language. A pipeline of 11 specialized AI agents auto-detects issue categories, calculates trust scores, assigns severity and SLA deadlines, auto-routes to departments, and manages SLA escalations.

---

## 🏛️ Project Architecture

```
c:/Users/divya/AiVerse/my-aiverse-server/
├── frontend/                  # Web Application Portals (HTML5, Tailwind CSS, Vanilla JS, Chart.js)
│   ├── index.html             # Citizen Portal (Hero 3-step reporting, track complaint, community wins)
│   ├── track.html             # Complaint status tracking timeline page
│   ├── dept-admin.html        # Department Admin Portal (Road, Water, Electrical, Sanitation, Forest)
│   ├── super-admin.html       # Super Admin Portal (Spam queue, analytics charts, overrides)
│   └── js/app.js              # Frontend JS module (API client, audio recorder, map handler, charts)
├── backend/                   # Python 3.12 FastAPI backend & AI Agents
│   ├── main.py                # FastAPI entry point & API routes
│   ├── config.py              # Configuration & .env settings
│   ├── database/              # DB setup, session management
│   ├── models/models.py       # SQLAlchemy ORM models (Complaint, AdminUser, AuditLog)
│   ├── schemas/schemas.py     # Pydantic schemas
│   ├── auth/auth.py           # JWT authentication & bcrypt hashing
│   ├── ai/service.py          # Abstracted provider-agnostic AI layer
│   ├── agents/                # 11 State-Machine AI Agents
│   │   ├── agents.py          # 11 Specialized Agent implementations
│   │   └── orchestrator.py    # Sequential pipeline coordinator
│   └── routers/               # API Routers (Citizen, Auth, Dept Admin, Super Admin)
├── mcp_server/                # FastMCP Server
│   └── server.py              # FastMCP server exposing 17 tools
├── uploads/                   # Uploaded complaint & completion images
├── database/                  # SQLite / PostgreSQL database & seed script
│   └── seed.py                # Initial admin accounts & sample complaint seeder
├── docker/                    # Containerization setup
│   ├── Dockerfile
│   └── docker-compose.yml
├── requirements.txt           # Python dependencies
├── package.json               # Maintained root commands
└── .env.example               # Environment variables
```

---

## 🤖 11-Step Agentic AI Pipeline (Strict Execution Order)

1. **IntakeAgent**: Validates upload, generates `anonymous_id` & `complaint_id`.
2. **VisionAgent**: Vision classification into 10 categories (`pothole`, `garbage accumulation`, `water leakage`, `broken streetlight`, `broken water pipe`, `sewage overflow`, `fallen tree`, `illegal dumping`, `road damage`, `drain blockage`).
3. **AuthenticityAgent**: Reverse image hash check, screenshot/meme detection, session check, GPS sanity -> calculates `trust_score` (0-100). If `trust_score < 50`, routes to Spam queue (SLA paused).
4. **LanguageAgent**: Audio transcription, translation to English, summary.
5. **LocationAgent**: Reverse geocoding & POI proximity check (schools, hospitals, markets).
6. **SeverityAgent**: Computes Critical/High/Medium/Low from baseline + POI boost + trust score.
7. **SLAAgent**: Assigns resolution deadline (Critical=24h, High=48h, Medium=72h, Low=7d), starting clock for high trust items.
8. **DuplicateAgent**: Location + Category matching to prevent duplicate SLAs.
9. **RoutingAgent**: Auto-assigns department (`Road`, `Water`, `Electrical`, `Sanitation`, `Forest`).
10. **EscalationAgent**: Background task checking SLA breaches, increments escalation level, alerts Super Admin.
11. **NotificationAgent**: Generates acknowledgement message & tracking links.

---

## 🛠️ FastMCP Server Tools (17 Tools)

1. `report_complaint`
2. `track_complaint`
3. `list_complaints`
4. `get_complaint`
5. `update_status`
6. `upload_completed_image`
7. `run_authenticity_check`
8. `mark_genuine`
9. `confirm_spam`
10. `get_analytics`
11. `high_priority`
12. `critical_pending`
13. `ward_complaints`
14. `department_complaints`
15. `search_complaint`
16. `escalate_overdue`
17. `override_severity`

---

## 🚀 Quick Start Guide

### 1. Install Dependencies & Seed Database
```bash
pip install -r requirements.txt
python database/seed.py
```

### 2. Run Web Application (FastAPI + Frontend)
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
# Or using npm
npm run dev
```

Visit the portals in your browser:
* **Citizen Portal**: `http://localhost:8000/`
* **Complaint Tracking**: `http://localhost:8000/track.html`
* **Department Admin**: `http://localhost:8000/dept-admin.html` (`admin_road` / `admin123`)
* **Super Admin**: `http://localhost:8000/super-admin.html` (`superadmin` / `admin123`)
* **API Documentation**: `http://localhost:8000/docs`

### 3. Run FastMCP Server
```bash
python mcp_server/server.py
# Or using npm
npm run mcp
```
