# BUILD_GUIDE.md — Shared Agent Memory MCP, A to Z

This document assumes you have never built anything like this before. Every step tells you:
**WHERE** you run it (which folder, whose machine), **WHAT** to type or create exactly,
and **WHY** you're doing it. Do not skip steps. Do not do steps out of order.

Read this top to bottom once before touching a keyboard, so you know where it's going.

Companion files: `ARCHITECTURE.md` (the design explained) and `task.md` (who does what).
This file is the literal keystroke-by-keystroke path. If the three ever disagree, this file wins.

---

## PART 0 — MENTAL MODEL (read this before anything else)

You are building **two programs that run separately and talk to each other**:

1. **The MCP server** — a Python program that stays running in one terminal window. Its whole job
   is to store and return "memories." It never stops during the demo.
2. **Agent scripts** — small Python programs that each run ONCE, do a task, talk to the MCP server,
   and then exit. You'll write 3 of these (research, coding, testing).

Plus one more thing for judges to see:

3. **A dashboard** — a webpage that reads the same data and displays it live. It never writes
   anything, only shows what's already there.

Nothing here is a chatbot. Nobody types into a chat box. Every "agent" is just a script you run
from the terminal with a command, and it does its thing and stops.

---

## PART 1 — INSTALL THE TOOLS ON YOUR MACHINE (every person does this individually)

Do this on **your own laptop**, once, before the hackathon if possible.

### 1.1 Check you have Python
Open a terminal (Mac: Terminal app. Windows: PowerShell). Type:
```
python3 --version
```
You need to see something like `Python 3.11` or higher. If you get an error or a version below 3.10,
install Python from https://www.python.org/downloads/ first, then re-run this command to confirm.

### 1.2 Install `uv` (the package manager the team is using)
Mac/Linux, in the terminal:
```
curl -LsSf https://astral.sh/uv/install.sh | sh
```
Windows (PowerShell):
```
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```
Then close and reopen your terminal (this refreshes what commands it knows about), and confirm:
```
uv --version
```
You should see a version number, no errors. If you don't, restart your terminal again — uv sets up
a path variable that only takes effect in a fresh terminal window.

**Why uv:** it manages Python packages and virtual environments faster than pip, and it's what the
team agreed on, so everyone's setup stays identical.

### 1.3 Install Node.js (only Member 4, the dashboard person, needs this)
Go to https://nodejs.org and install the LTS version. Confirm in terminal:
```
node --version
npm --version
```
Both should print version numbers.

### 1.4 Install Git (almost certainly already installed)
```
git --version
```
If missing, install from https://git-scm.com/downloads.

### 1.5 Get your API keys ready (do this now, don't wait)
- Member 1: your Claude Code subscription already handles this, no separate key needed for Claude
  Code itself. Member 1 is building the MCP server and memory engine — the core product and the
  hardest part to get right — which is why this member gets the strongest tool.
- Members 2, 3, 4 (DeepSeek): go to https://platform.deepseek.com, sign up, go to API Keys,
  create one, copy it somewhere safe (a notes app). You'll paste it into a `.env` file later — never
  into code, never into a git commit.

**Stop here. Do not continue to Part 2 until every person has completed 1.1–1.5.**

---

## PART 2 — CREATE THE REPOSITORY (ONE person does this, the others wait and watch)

Pick one person — doesn't matter who, this isn't a "leader" role, just whoever clicks first.

### 2.1 Create the GitHub repo
- Go to https://github.com/new in a browser.
- Repository name: `shared-agent-memory-mcp`
- Keep it **Public** or **Private**, team's choice, doesn't matter functionally.
- Check "Add a README file."
- Click **Create repository**.
- Copy the URL it gives you (looks like `https://github.com/yourname/shared-agent-memory-mcp.git`).

### 2.2 Share that URL with the other 3 people now, before continuing.

---

## PART 3 — EVERYONE CLONES THE REPO (all 4 people, on their own machine)

### 3.1 Pick a folder on your computer where you keep code
Example, in terminal:
```
cd ~/Desktop
```
(You can use any folder — Desktop is just easy to find.)

### 3.2 Clone the repo
```
git clone https://github.com/yourname/shared-agent-memory-mcp.git
```
(Use the actual URL from step 2.1, not this placeholder.)

### 3.3 Move into the folder
```
cd shared-agent-memory-mcp
```
**Every command from now on in this guide assumes your terminal is inside this folder**, unless
explicitly told otherwise. If you ever get a "file not found" error, the first thing to check is
whether you're in the right folder — type `pwd` (Mac/Linux) or `cd` alone (Windows) to see where you are.

---

## PART 4 — SET UP THE PROJECT SKELETON (only the SAME one person from Part 2 does this)

Everyone else: read along, don't type yet — you'll pull these changes down in Part 5.

### 4.1 Initialize the Python project
```
uv init --no-readme
```
**What this does:** creates a `pyproject.toml` file, which is like a packing list — it tracks which
Python packages this project needs, so everyone installs the exact same versions.
**Why `--no-readme`:** we already have a README from GitHub, we don't want uv to overwrite it.

### 4.2 Install every package the project needs
```
uv add mcp langgraph langchain-core chromadb sentence-transformers fastapi uvicorn python-dotenv openai anthropic
```
**What this does:** downloads all these libraries and records them in `pyproject.toml`. This will take
a minute or two — some of these (like sentence-transformers) are large.

**What each one is for, so you're not installing mystery things:**
- `mcp` — lets us build the MCP server (the core product)
- `langgraph` — lets us build agents that do multi-step work and hand off tasks to each other
- `langchain-core` — small helper library langgraph relies on
- `chromadb` — the vector database, stores memory for meaning-based search
- `sentence-transformers` — turns text into the number-vectors chromadb needs, runs locally, free
- `fastapi` + `uvicorn` — runs the dashboard's backend web server
- `python-dotenv` — reads your `.env` file so API keys aren't hardcoded in code
- `openai` — DeepSeek's API uses the same format as OpenAI's, so we use this library to call it
- `anthropic` — in case any script needs to call Claude directly

### 4.3 Create the `.gitignore` file
This tells Git which files to NEVER upload (secrets, generated junk, huge folders).

Create a new file named exactly `.gitignore` in the root of the project (same folder as
`pyproject.toml`), with this content:
```
.venv/
__pycache__/
*.pyc
.env
data/memory.db
data/chroma/
node_modules/
dist/
```

### 4.4 Create the `.env.example` file
Create a file named exactly `.env.example` with this content:
```
DEEPSEEK_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```
**Why this file exists but `.env` doesn't get committed:** `.env.example` is a template so teammates
know what keys they need, without ever seeing anyone's real secret key in GitHub.

### 4.5 Create your own real `.env` file (every person does this individually, including you right now)
Create a file named exactly `.env` (note: no `.example`) with your real keys:
```
DEEPSEEK_API_KEY=paste_your_real_key_here
ANTHROPIC_API_KEY=paste_your_real_key_here
```
This file will NOT be uploaded to GitHub (because of `.gitignore`) — that's intentional.

### 4.6 Create the folder structure
```
mkdir -p backend agents dashboard/frontend data
touch backend/__init__.py agents/__init__.py
```
**What `touch backend/__init__.py` does:** creates an empty file that tells Python "this folder is a
package you can import from." Without it, `from backend import memory_engine` later would fail.

**Confirm the structure looks right:**
```
ls -la
```
You should see: `backend/`, `agents/`, `dashboard/`, `data/`, `.env`, `.env.example`, `.gitignore`,
`pyproject.toml`, `README.md`.

### 4.7 Push this skeleton to GitHub
```
git add .
git commit -m "repo skeleton: folders, deps, gitignore"
git push
```
**What `git add .` does:** stages every changed/new file (except what `.gitignore` excludes) to be
saved. **What `git commit -m "..."` does:** saves a snapshot with a message describing what changed.
**What `git push` does:** uploads that snapshot to GitHub so teammates can get it.

**Tell the other 3 people right now: "skeleton is pushed, pull it."**

---

## PART 5 — EVERYONE ELSE PULLS THE SKELETON (Members 2, 3, 4 — Member 1 already has it)

Each person, in their own terminal, inside the `shared-agent-memory-mcp` folder:

### 5.1 Pull the latest code
```
git pull
```

### 5.2 Create your own `.env` file (same as step 4.5 — every person needs their own)
Create `.env` in the root folder with your real API key(s), as in 4.5. Do this now if you haven't.

### 5.3 Let uv set up your local environment from the packing list
```
uv sync
```
**What this does:** reads `pyproject.toml` (which now exists because you pulled it) and installs the
exact same packages Member 1 installed, into a local `.venv` folder just for you.

### 5.4 Confirm everything installed correctly
```
uv run python -c "import mcp, langgraph, chromadb; print('all good')"
```
You must see `all good` printed with no errors before continuing. If you see an error, run
`uv sync` again, and if it persists, ask in the group chat before proceeding — don't debug alone
for more than 5 minutes on this, it blocks nothing else yet but will block everything soon.

**Nobody proceeds past this point until all 4 people have done Part 5 successfully.**

---

## PART 6 — MEMBER 1 BUILDS THE MEMORY CORE (using Claude Code) (Members 2, 3, 4 read Part 6 once, then skip to their own Part while waiting)

This is the core product and the hardest part to get right — that's why Member 1 uses Claude Code
instead of the free tier. Everyone else is blocked on this part finishing.


Everything in Part 6 happens in Member 1's terminal, inside the project folder.

### 6.1 Build `backend/memory_models.py`

**Where:** create the file at `backend/memory_models.py`.
**Why this file first:** every other file needs to agree on exactly what fields a "memory" has. If
you define that shape once here, nothing downstream can get it wrong.

Paste this exact content:
```python
from dataclasses import dataclass, field
from datetime import datetime
import uuid

VALID_TYPES = ("fact", "decision", "event", "result")

@dataclass
class Memory:
    content: str
    memory_type: str
    project_id: str
    task_id: str
    agent_id: str
    importance: float = 0.5
    memory_id: str = field(default_factory=lambda: f"mem_{uuid.uuid4().hex[:8]}")
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def __post_init__(self):
        if self.memory_type not in VALID_TYPES:
            raise ValueError(f"memory_type must be one of {VALID_TYPES}, got {self.memory_type}")

    def to_dict(self):
        return {
            "memory_id": self.memory_id,
            "content": self.content,
            "memory_type": self.memory_type,
            "project_id": self.project_id,
            "task_id": self.task_id,
            "agent_id": self.agent_id,
            "importance": self.importance,
            "timestamp": self.timestamp,
        }
```
Save the file. No command to run yet — this file just defines a shape, nothing executes on its own.

### 6.2 Build `backend/sqlite_store.py`

**Where:** create `backend/sqlite_store.py`.
**Why:** this is where memories actually get saved to a file on disk, and where exact-match lookups
(give me everything for task X) happen.

Paste this exact content:
```python
import sqlite3
import os
from backend.memory_models import Memory

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "memory.db")

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            memory_id TEXT PRIMARY KEY,
            content TEXT,
            memory_type TEXT,
            project_id TEXT,
            task_id TEXT,
            agent_id TEXT,
            importance REAL,
            timestamp TEXT
        )
    """)
    conn.commit()
    conn.close()

def insert_memory(memory: Memory) -> str:
    conn = sqlite3.connect(DB_PATH)
    d = memory.to_dict()
    conn.execute(
        "INSERT INTO memories VALUES (:memory_id, :content, :memory_type, :project_id, :task_id, :agent_id, :importance, :timestamp)",
        d,
    )
    conn.commit()
    conn.close()
    return memory.memory_id

def get_by_task(task_id: str) -> list:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM memories WHERE task_id = ?", (task_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_by_agent(agent_id: str, project_id: str) -> list:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM memories WHERE agent_id = ? AND project_id = ?", (agent_id, project_id)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_decisions(project_id: str, task_id: str = None) -> list:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    if task_id:
        rows = conn.execute(
            "SELECT * FROM memories WHERE project_id = ? AND task_id = ? AND memory_type = 'decision'",
            (project_id, task_id),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM memories WHERE project_id = ? AND memory_type = 'decision'", (project_id,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_all() -> list:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM memories ORDER BY timestamp DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]
```

### 6.3 Test `sqlite_store.py` by itself before continuing

**Where to run this:** your terminal, in the project root folder (not inside `backend/`).
```
uv run python -c "
from backend.sqlite_store import init_db, insert_memory, get_all
from backend.memory_models import Memory
init_db()
m = Memory(content='test memory', memory_type='fact', project_id='p1', task_id='t1', agent_id='a1')
print(insert_memory(m))
print(get_all())
"
```
**What you should see:** a printed memory_id like `mem_a1b2c3d4`, then a list containing your test
memory. If you see an error instead, fix it before moving to 6.4 — nothing after this will work if
this doesn't.

**Why test now instead of waiting:** if something's broken, you want to know it's THIS file, not
guess later between 4 files at once.

### 6.4 Build `backend/vector_store.py`

**Where:** create `backend/vector_store.py`.
**Why:** this is the meaning-based search — lets an agent ask "what database did we pick" and find
a memory that says "ChromaDB was selected" even without matching words exactly.

```python
import os
import chromadb
from chromadb.utils import embedding_functions

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "chroma")

_client = None
_collection = None
_embedder = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

def init_vector_store():
    global _client, _collection
    os.makedirs(CHROMA_PATH, exist_ok=True)
    _client = chromadb.PersistentClient(path=CHROMA_PATH)
    _collection = _client.get_or_create_collection(name="agent_memory", embedding_function=_embedder)

def add_memory(memory_dict: dict):
    _collection.add(
        ids=[memory_dict["memory_id"]],
        documents=[memory_dict["content"]],
        metadatas=[{
            "project_id": memory_dict["project_id"],
            "task_id": memory_dict["task_id"],
            "agent_id": memory_dict["agent_id"],
            "memory_type": memory_dict["memory_type"],
        }],
    )

def semantic_search(query: str, project_id: str, task_id: str = None, limit: int = 5) -> list:
    where = {"project_id": project_id}
    if task_id:
        where = {"$and": [{"project_id": project_id}, {"task_id": task_id}]}
    results = _collection.query(query_texts=[query], n_results=limit, where=where)
    output = []
    if results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            output.append({
                "content": doc,
                "memory_id": results["ids"][0][i],
                **results["metadatas"][0][i],
            })
    return output
```

**Note on first run:** the first time this runs, `sentence-transformers` downloads a small model file
(~80MB) automatically. This needs internet access once. If you're worried about hackathon wifi, run
this test now while you have a good connection, not last-minute.

### 6.5 Test `vector_store.py` by itself
```
uv run python -c "
from backend.vector_store import init_vector_store, add_memory, semantic_search
init_vector_store()
add_memory({'memory_id':'mem_test1','content':'Chose ChromaDB for vector storage because it is free and local','memory_type':'decision','agent_id':'a1','task_id':'t1','project_id':'p1'})
print(semantic_search('what vector database did we choose', 'p1'))
"
```
**What you should see:** your test memory returned, even though your query words don't exactly match
the stored content. That proves meaning-based search is working.

### 6.6 Build `backend/memory_engine.py`

**Where:** create `backend/memory_engine.py`.
**Why:** single place that ties SQLite + Chroma together, so nothing outside this file needs to know
either of those exist.

```python
from backend.memory_models import Memory
from backend import sqlite_store
from backend import vector_store

def setup():
    sqlite_store.init_db()
    vector_store.init_vector_store()

def remember(content: str, memory_type: str, project_id: str, task_id: str, agent_id: str, importance: float = 0.5) -> str:
    memory = Memory(
        content=content, memory_type=memory_type, project_id=project_id,
        task_id=task_id, agent_id=agent_id, importance=importance,
    )
    sqlite_store.insert_memory(memory)
    vector_store.add_memory(memory.to_dict())
    return memory.memory_id

def recall(query: str, project_id: str, task_id: str = None, limit: int = 5) -> list:
    return vector_store.semantic_search(query, project_id, task_id, limit)

def get_task_memory(task_id: str) -> dict:
    rows = sqlite_store.get_by_task(task_id)
    grouped = {"fact": [], "decision": [], "event": [], "result": []}
    for r in rows:
        grouped[r["memory_type"]].append(r)
    return grouped

def get_decisions(project_id: str, task_id: str = None) -> list:
    return sqlite_store.get_decisions(project_id, task_id)

def get_agent_history(agent_id: str, project_id: str) -> list:
    return sqlite_store.get_by_agent(agent_id, project_id)

def store_result(task_id: str, result: str, agent_id: str, project_id: str) -> str:
    return remember(content=result, memory_type="result", project_id=project_id, task_id=task_id, agent_id=agent_id, importance=0.8)

def handoff_task(task_id: str, from_agent: str, to_agent: str, summary: str, next_steps: str, project_id: str) -> str:
    content = f"Handoff from {from_agent} to {to_agent}. Summary: {summary}. Next steps: {next_steps}"
    return remember(content=content, memory_type="event", project_id=project_id, task_id=task_id, agent_id=from_agent, importance=0.7)
```

### 6.7 Test `memory_engine.py` end to end
```
uv run python -c "
from backend import memory_engine
memory_engine.setup()
memory_engine.remember('Chose ChromaDB because it is free and local', 'decision', 'demo_project', 'task1', 'research_agent')
print(memory_engine.recall('what storage did we choose', 'demo_project'))
print(memory_engine.get_task_memory('task1'))
"
```
Confirm both print statements return your data with no errors before moving on.

### 6.8 Build `backend/mcp_server.py`

**Where:** create `backend/mcp_server.py`.
**Why:** this is the actual product — it exposes memory_engine's functions as MCP tools that ANY AI
agent (Claude, DeepSeek-based agent, anything MCP-compatible) can call.

```python
from mcp.server.fastmcp import FastMCP
from backend import memory_engine

memory_engine.setup()
mcp = FastMCP("shared-agent-memory")

@mcp.tool()
def remember(content: str, memory_type: str, project_id: str, task_id: str, agent_id: str, importance: float = 0.5) -> str:
    """Store a new memory (fact, decision, event, or result) so other agents can find it later."""
    return memory_engine.remember(content, memory_type, project_id, task_id, agent_id, importance)

@mcp.tool()
def recall(query: str, project_id: str, task_id: str = "", limit: int = 5) -> list:
    """Search memory by meaning. Use this BEFORE starting work to see what other agents already found."""
    return memory_engine.recall(query, project_id, task_id or None, limit)

@mcp.tool()
def get_task_memory(task_id: str) -> dict:
    """Get everything known about one task, grouped by type: facts, decisions, events, results."""
    return memory_engine.get_task_memory(task_id)

@mcp.tool()
def get_decisions(project_id: str, task_id: str = "") -> list:
    """Get just the decisions made so far on this project or task, with reasons."""
    return memory_engine.get_decisions(project_id, task_id or None)

@mcp.tool()
def get_agent_history(agent_id: str, project_id: str) -> list:
    """Get everything a specific agent has done before on this project."""
    return memory_engine.get_agent_history(agent_id, project_id)

@mcp.tool()
def store_result(task_id: str, result: str, agent_id: str, project_id: str) -> str:
    """Store the final output of a completed task."""
    return memory_engine.store_result(task_id, result, agent_id, project_id)

@mcp.tool()
def handoff_task(task_id: str, from_agent: str, to_agent: str, summary: str, next_steps: str, project_id: str) -> str:
    """Record that one agent is handing a task off to another, with a summary and next steps."""
    return memory_engine.handoff_task(task_id, from_agent, to_agent, summary, next_steps, project_id)

if __name__ == "__main__":
    mcp.run()
```

### 6.9 Test the MCP server with the built-in inspector

**Where:** terminal, project root.
```
uv run mcp dev backend/mcp_server.py
```
This opens a local web inspector (it will print a URL, open it in your browser). In that UI:
1. Find the `remember` tool, fill in test values, click run. Confirm it returns a memory_id.
2. Find the `recall` tool, search for something related to what you just stored. Confirm it comes back.

Leave this running for now, or stop it with `Ctrl+C` in the terminal — either is fine, you'll start it
properly in Part 9.

### 6.10 Push your work
```
git add backend/
git commit -m "Member 1: memory engine + MCP server working end-to-end"
git push
```
**Immediately tell Members 2 and 3 in your group chat: "backend is pushed, pull now."** They are
blocked until this exists.

---

## PART 7 — MEMBER 2 BUILDS THE RESEARCH AGENT (using OpenCode / DeepSeek)

**Before starting 7.2, wait until Member 1 confirms Part 6 is pushed, then run:**
```
git pull
uv sync
```
(`uv sync` again because `pyproject.toml` might not have changed, but it's a safe habit to run it
after every pull in case teammates added a package.)

### 7.1 Build `agents/llm_client.py` (can be done BEFORE Member 1 finishes, no dependency)

**Where:** create `agents/llm_client.py`.
**Why:** one shared function that talks to DeepSeek, so every agent script calls this instead of
repeating API setup code 3 times.

```python
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com",
)

def ask_llm(prompt: str, system: str = "You are a helpful AI agent.") -> str:
    """Send a prompt to DeepSeek and return its plain text response."""
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content
```

### 7.2 Test it
```
uv run python -c "from agents.llm_client import ask_llm; print(ask_llm('Say hello in exactly 5 words'))"
```
You should see a 5-word response. If you get an authentication error, your `.env` file's
`DEEPSEEK_API_KEY` is missing or wrong — fix that before continuing.

### 7.3 Build `agents/research_agent.py`

**Where:** create `agents/research_agent.py`.
**Why:** this is "Agent A" in the demo. It does a task, then writes what it found into shared memory
using the MCP server — this is the FIRST half of proving the concept.

This connects to the MCP server as a client. Paste this exact content:
```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from agents.llm_client import ask_llm

PROJECT_ID = "demo_project"
TASK_ID = "task_vector_db"
AGENT_ID = "research_agent"

RESEARCH_PROMPT = """You are a Research Agent working on a shared team project. Your task is:
"Research the best storage approach for a shared AI agent memory system, comparing at least 2 options."

Give a short comparison (3-4 sentences) and then clearly state your final decision in this format:
DECISION: <what you chose>
REASON: <why, in one sentence>

Keep your entire answer under 150 words."""

async def main():
    server_params = StdioServerParameters(command="uv", args=["run", "backend/mcp_server.py"])
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            print("Research agent thinking...")
            answer = ask_llm(RESEARCH_PROMPT)
            print("LLM answered:\n", answer)

            await session.call_tool("remember", {
                "content": answer,
                "memory_type": "decision",
                "project_id": PROJECT_ID,
                "task_id": TASK_ID,
                "agent_id": AGENT_ID,
                "importance": 0.9,
            })
            await session.call_tool("store_result", {
                "task_id": TASK_ID,
                "result": answer,
                "agent_id": AGENT_ID,
                "project_id": PROJECT_ID,
            })
            print("Research agent stored its findings in shared memory.")

if __name__ == "__main__":
    asyncio.run(main())
```

**Why it launches the server itself (`command="uv", args=["run", "backend/mcp_server.py"]`):** MCP
clients typically start their own copy of the server process over "stdio" (standard input/output).
This is normal MCP behavior — you don't need a separately-running server for this script to work,
though for the live demo dashboard you'll ALSO run the server separately so the dashboard can read
from the same database file while agents run.

### 7.4 Run it (only after Part 6 is pushed and pulled)
```
uv run python agents/research_agent.py
```
**What you should see:** "Research agent thinking...", then the LLM's answer printed, then
"Research agent stored its findings in shared memory."

**Confirm the memory actually saved**, by checking the database file exists:
```
uv run python -c "from backend.sqlite_store import get_all; print(get_all())"
```
You should see your research agent's memory in the list.

### 7.5 Push your work
```
git add agents/llm_client.py agents/research_agent.py
git commit -m "Member 2: research agent stores memory via MCP"
git push
```
Tell Member 3: "research agent works and is pushed."

---

## PART 8 — MEMBER 3 BUILDS THE CODING AGENT + TESTING AGENT (using OpenCode / DeepSeek)

**Wait for Part 6 (Member 1) to be pushed before starting. Part 7 (Member 2) being done first is
helpful but not strictly required to write the code — only to test it end-to-end.**
```
git pull
uv sync
```

### 8.1 Build `agents/coding_agent.py`

**Where:** create `agents/coding_agent.py`.
**Why:** this is "Agent B" — the entire point of the project. It must call `recall()` BEFORE it does
anything else, and its answer must reference what it found. This is the moment that proves agents
share memory.

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from agents.llm_client import ask_llm

PROJECT_ID = "demo_project"
TASK_ID = "task_vector_db"
AGENT_ID = "coding_agent"

CODING_PROMPT_TEMPLATE = """You are a Coding Agent working on the same shared team project as other agents.
Before starting, here is what a previous agent already discovered and decided:

{recalled_memories}

Your task is: "Describe how you would implement the memory storage layer, given the above decision."
You MUST explicitly reference the previous agent's decision by name in your first sentence — do not repeat their research, build on it.
Keep your entire answer under 150 words."""

async def main():
    server_params = StdioServerParameters(command="uv", args=["run", "backend/mcp_server.py"])
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            print("Coding agent recalling prior work...")
            recalled = await session.call_tool("recall", {
                "query": "vector database storage decision",
                "project_id": PROJECT_ID,
                "task_id": TASK_ID,
            })
            recalled_text = str(recalled.content)
            print("Recalled:\n", recalled_text)

            prompt = CODING_PROMPT_TEMPLATE.format(recalled_memories=recalled_text)
            answer = ask_llm(prompt)
            print("LLM answered:\n", answer)

            await session.call_tool("remember", {
                "content": answer,
                "memory_type": "event",
                "project_id": PROJECT_ID,
                "task_id": TASK_ID,
                "agent_id": AGENT_ID,
                "importance": 0.8,
            })
            await session.call_tool("store_result", {
                "task_id": TASK_ID,
                "result": answer,
                "agent_id": AGENT_ID,
                "project_id": PROJECT_ID,
            })
            print("Coding agent stored its work in shared memory.")

if __name__ == "__main__":
    asyncio.run(main())
```

### 8.2 Run it (only after `research_agent.py` has been run at least once, so there's something to recall)
```
uv run python agents/coding_agent.py
```
**What you're checking for:** the printed LLM answer should explicitly mention the research agent's
decision (e.g. mention "ChromaDB" or whatever it chose). If it doesn't reference it at all, the recall
step likely returned empty — check that `research_agent.py` was actually run first and stored
something in the same `PROJECT_ID`/`TASK_ID`.

### 8.3 Build `agents/testing_agent.py`

**Where:** create `agents/testing_agent.py`. Same pattern, simpler — summarizes everything.

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from agents.llm_client import ask_llm

PROJECT_ID = "demo_project"
TASK_ID = "task_vector_db"
AGENT_ID = "testing_agent"

TESTING_PROMPT_TEMPLATE = """You are a Testing Agent working on the same shared team project as other agents.
Here is the full history of what has been done on this task so far:

{full_task_memory}

Summarize what has been built and confirm whether the work is ready for testing, in under 100 words.
Reference at least the research decision and the implementation approach by name."""

async def main():
    server_params = StdioServerParameters(command="uv", args=["run", "backend/mcp_server.py"])
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            print("Testing agent retrieving full task history...")
            full_memory = await session.call_tool("get_task_memory", {"task_id": TASK_ID})
            full_memory_text = str(full_memory.content)

            prompt = TESTING_PROMPT_TEMPLATE.format(full_task_memory=full_memory_text)
            answer = ask_llm(prompt)
            print("Testing agent summary:\n", answer)

            await session.call_tool("store_result", {
                "task_id": TASK_ID,
                "result": answer,
                "agent_id": AGENT_ID,
                "project_id": PROJECT_ID,
            })
            print("Testing agent stored its summary.")

if __name__ == "__main__":
    asyncio.run(main())
```

### 8.4 Run it (after both research_agent.py and coding_agent.py have run at least once)
```
uv run python agents/testing_agent.py
```
Confirm the summary mentions both prior agents' work.

### 8.5 Push your work
```
git add agents/coding_agent.py agents/testing_agent.py
git commit -m "Member 3: coding + testing agents, both recall before acting"
git push
```

---

## PART 9 — MEMBER 4 BUILDS THE DASHBOARD (using OpenCode / DeepSeek)

**You do not need to wait for anyone.** Start immediately after Part 5. Build against fake data
first, connect to real data later once Part 6 is pushed.

### 9.1 Create fake sample data to build against
Create `dashboard/sample_data.json`:
```json
[
  {"memory_id": "mem_1", "content": "Chose ChromaDB for vector storage", "memory_type": "decision", "agent_id": "research_agent", "task_id": "task_vector_db", "timestamp": "2026-07-31T14:00:00"},
  {"memory_id": "mem_2", "content": "Implemented memory_engine.py using the chosen storage", "memory_type": "event", "agent_id": "coding_agent", "task_id": "task_vector_db", "timestamp": "2026-07-31T14:05:00"},
  {"memory_id": "mem_3", "content": "All tests passed, system ready", "memory_type": "result", "agent_id": "testing_agent", "task_id": "task_vector_db", "timestamp": "2026-07-31T14:10:00"}
]
```

### 9.2 Build `dashboard/api.py` — first against fake data
**Where:** create `dashboard/api.py`.
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
import os

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SAMPLE_PATH = os.path.join(os.path.dirname(__file__), "sample_data.json")

@app.get("/api/timeline")
def timeline():
    with open(SAMPLE_PATH) as f:
        return json.load(f)
```

### 9.3 Run the dashboard backend
```
uv run uvicorn dashboard.api:app --reload --port 8000
```
Open http://localhost:8000/api/timeline in a browser — you should see the fake JSON data.
Leave this running, open a new terminal tab for the next step.

### 9.4 Create the frontend
**Where:** a new terminal, project root.
```
cd dashboard
npm create vite@latest frontend -- --template react
```
When prompted, confirm creating in the `frontend` folder.
```
cd frontend
npm install
```

### 9.5 Build the dashboard UI
Open `dashboard/frontend/src/App.jsx` and replace its content with something that:
- fetches `http://localhost:8000/api/timeline` every 2 seconds
- shows each entry as a row: timestamp, agent_id, memory_type, content
- newest entries at the top

Keep it simple — a styled `<ul>` of `<li>` rows is enough. Use a dark background and monospace font
so it reads clearly from a distance during the demo.

### 9.6 Run the frontend
```
npm run dev
```
It will print a local URL (usually `http://localhost:5173`). Open it — you should see your fake
timeline data rendering and refreshing.

### 9.7 Push your work (checkpoint 1, with fake data)
```
cd ../..
git add dashboard/
git commit -m "Member 4: dashboard UI working against sample data"
git push
```

### 9.8 Once Member 1's Part 6 is pushed and pulled, swap to real data
```
git pull
```
Edit `dashboard/api.py` to replace the fake-data function with a real one:
```python
from backend import sqlite_store

@app.get("/api/timeline")
def timeline():
    return sqlite_store.get_all()
```
Restart the backend (`Ctrl+C` then re-run the `uvicorn` command from 9.3). Refresh the frontend
browser tab — it should now show real memories once agents have run.

### 9.9 Push checkpoint 2
```
git add dashboard/api.py
git commit -m "Member 4: dashboard wired to real memory data"
git push
```

---

## PART 10 — FULL INTEGRATION RUN (all 4 people, together, same room)

Do this only after Parts 6, 7, 8, and 9 are all pushed and everyone has pulled.

### 10.1 Everyone pulls the final code
```
git pull
uv sync
```

### 10.2 Open 4 separate terminal windows/tabs, all inside the project folder

**Terminal 1 — start the dashboard backend:**
```
uv run uvicorn dashboard.api:app --reload --port 8000
```
Leave running.

**Terminal 2 — start the dashboard frontend:**
```
cd dashboard/frontend
npm run dev
```
Leave running. Open the printed URL in a browser and keep it visible.

**Terminal 3 — reset the data so the demo starts clean:**
```
rm -f data/memory.db
rm -rf data/chroma
```
(This deletes old test data so the demo shows a clean run, not leftover test memories.)

**Terminal 3 — run the agents in order, one at a time, watching the dashboard update after each:**
```
uv run python agents/research_agent.py
```
Wait for it to finish and check the dashboard shows the new entry.
```
uv run python agents/coding_agent.py
```
Confirm out loud, as a group, that its printed answer references the research agent's decision.
Check the dashboard again.
```
uv run python agents/testing_agent.py
```
Check the dashboard one final time — it should now show all 3 agents' entries in order.

### 10.3 If the coding agent's answer does NOT reference the research agent's decision
This is the one failure that matters most — stop and fix this before anything else:
1. Check both scripts use the exact same `PROJECT_ID` and `TASK_ID` values.
2. Run `uv run python -c "from backend.sqlite_store import get_all; print(get_all())"` to confirm the
   research agent's memory actually saved.
3. Check `coding_agent.py`'s `recall` call happens BEFORE `ask_llm` is called — order matters.

### 10.4 Final push
```
git add .
git commit -m "full end-to-end demo working"
git push
```

### 10.5 Rehearse
Run the exact sequence in 10.2 again, out loud, deciding who talks during which step. Do this at
least once before presenting to judges — the first run of anything always surfaces a small surprise,
better to find it now than live.

---

## PART 11 — IF SOMETHING BREAKS AND YOU'RE LOW ON TIME

Cut things in this exact order, don't cut anything before it:

1. Drop `handoff_task` — never call it. `remember`/`recall` alone still proves the whole concept.
2. Drop the Testing Agent — Research → Coding alone is still a valid, complete demo.
3. Drop dashboard styling polish — a plain unstyled list of timeline rows still proves it works.
4. **Never drop:** the MCP server, `remember`/`recall`, or the moment the Coding Agent's answer
   visibly references the Research Agent's decision. That single moment IS the product.
