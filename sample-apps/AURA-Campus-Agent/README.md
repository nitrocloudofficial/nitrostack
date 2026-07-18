# AURA — Smart Campus Operations Agent 🔮

**Team Name:** Allu Nikitha  
**Hackathon:** NitroStack MCP Hackathon

---

## What it does

AURA (Autonomous University Resource Agent) is a smart campus operations system powered by the **Model Context Protocol (MCP)**. It gives students a single conversational interface to manage their entire academic life.

### Key Features
- 📊 **Dashboard** — Live stats for attendance, grievances, library loans, dues, and CGPA
- 🤖 **AI Agent Console** — Natural-language queries that chain across 9 MCP servers (e.g. *"Am I eligible for placements?"*)
- 📅 **Timetable & Attendance** — View schedule; flag low-attendance courses
- 📝 **Grievance Management** — File and track campus complaints
- 🏠 **Hostel & Outpass** — Apply for weekend leave with automated eligibility checks
- 📚 **Library** — View borrowed books and fines
- 💰 **Finance** — Outstanding fees and payment history
- 🏆 **Placements** — CGPA, backlogs, application tracking
- 🎉 **Events** — Upcoming campus events and registration

### MCP Architecture
9 domain-specific MCP servers expose tools to the orchestrator:
`attendance`, `timetable`, `complaint`, `hostel`, `library`, `finance`, `placement`, `events`, `profile`

The agent can chain tools across servers in a single request (e.g. check attendance + finance + library before approving an outpass).

---

## How to Run

### Prerequisites
- Python 3.10+
- Node.js 20+

### 1. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 2. (Optional) Add Anthropic API Key for Claude-powered routing
```bash
# Create .env file
echo "ANTHROPIC_API_KEY=your_key_here" > .env
```
*Without a key, AURA uses a deterministic local agent that still calls all real MCP tools.*

### 3. Start the backend
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Install frontend dependencies and build
```bash
cd frontend
npm install
npm run build
cd ..
```

### 5. Open the frontend
Open `frontend/index.html` in your browser (via Live Server or any HTTP server), or run the Node.js server:
```bash
npm install
npm start
# Then visit http://localhost:3000
```

---

## Project Structure

```
AURA-Campus-Agent/
├── backend/
│   ├── main.py              # FastAPI app + CORS + lifespan
│   ├── db.py                # In-memory campus data store
│   └── agent/
│       └── orchestrator.py  # MCP client manager + LLM routing
├── mcp_servers/             # 9 MCP tool servers (stdio)
│   ├── attendance_mcp.py
│   ├── complaint_mcp.py
│   ├── events_mcp.py
│   ├── finance_mcp.py
│   ├── hostel_mcp.py
│   ├── library_mcp.py
│   ├── placement_mcp.py
│   ├── profile_mcp.py
│   └── timetable_mcp.py
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, Agent, Attendance, etc.
│   │   ├── components/      # StatCard, AgentConsole, etc.
│   │   └── services/api.js  # REST client
│   └── index.html
├── requirements.txt
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Agent Protocol | **MCP (Model Context Protocol)** |
| Backend | FastAPI + Uvicorn |
| LLM (optional) | Claude 3.5 Sonnet via Anthropic SDK |
| Frontend | React 18 + Vite |
| Styling | Vanilla CSS (glassmorphism design) |
| Data | In-memory Python dict store (demo) |
