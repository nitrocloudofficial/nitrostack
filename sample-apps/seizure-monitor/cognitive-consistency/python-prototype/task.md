# task.md — Shared Agent Memory MCP — Hackathon Build Plan

Read `ARCHITECTURE.md` first if you haven't. This file is the actual step-by-step for each person.

**Team setup:**
- Member 1 → using Claude Code (subscription) — builds the MCP server + memory engine, the core
  product and the hardest part, so it gets the strongest model. This is the person who understands
  AI already.
- Members 2, 3, 4 → using OpenCode with free DeepSeek V4 Flash model
- One of the four is also the web designer with no prior AI agent experience

**Timeline:** Hackathon starts July 31, ends Aug 1. Assume ~20-24 working hours total.

---

## §0 — BEFORE ANYONE TOUCHES CODE (all 4 people, do this together, ~20 min)

1. One person creates the GitHub repo (empty, just a README).
2. Everyone else clones it locally:
   ```
   git clone <repo-url>
   cd shared-agent-memory-mcp
   ```
3. Agree out loud on the folder structure in `ARCHITECTURE.md` §9. Don't skip this — if two people guess different folder names, imports break later and you lose an hour debugging nothing.
4. Whoever created the repo runs this ONCE and pushes it, then everyone else pulls:
   ```
   uv init --no-readme
   uv add mcp langgraph langchain-core chromadb sentence-transformers fastapi uvicorn python-dotenv openai anthropic
   ```
5. Create `.gitignore` with:
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
6. Create `.env.example`:
   ```
   DEEPSEEK_API_KEY=your_key_here
   ANTHROPIC_API_KEY=your_key_here
   ```
   Each person copies this to their own `.env` (not committed) and fills in their own key.
7. Create the empty folders from §9 of ARCHITECTURE.md so everyone's imports resolve:
   ```
   mkdir -p backend agents dashboard/frontend data
   touch backend/__init__.py agents/__init__.py
   ```
8. Commit and push this skeleton:
   ```
   git add .
   git commit -m "repo skeleton: folders, deps, gitignore"
   git push
   ```
9. Everyone pulls before starting their own part:
   ```
   git pull
   ```

**Do not proceed until every person's `uv run python -c "import mcp, langgraph, chromadb"` works with no errors.**

---

## §1 — MEMBER 1: Memory Core + MCP Server (the foundation everyone else needs)

**What you're building:** the actual brain of the project — where memories get stored and how other agents ask for them back. Everyone else is blocked on you finishing the MCP server before they can fully test their agents, so start immediately.

**Why this order:** models → storage → engine → MCP wrapper. Each file only depends on the one before it.

### Step 1.1 — `backend/memory_models.py`
This file defines what a "memory" looks like in code (no logic, just the shape of the data).

```
touch backend/memory_models.py
```

Write a Python dataclass or dict schema matching ARCHITECTURE.md §6 — fields: `memory_id`, `content`, `memory_type`, `agent_id`, `task_id`, `project_id`, `timestamp`, `importance`. `memory_type` must be one of: `fact`, `decision`, `event`, `result`.

**Why this file exists on its own:** every other file (SQLite store, vector store, MCP tools) needs to agree on this exact shape. If you define it once here and import it everywhere, nobody accidentally uses mismatched field names.

### Step 1.2 — `backend/sqlite_store.py`
This is where structured memory actually gets written to disk.

```
touch backend/sqlite_store.py
```

Build functions:
- `init_db()` — creates the `data/memory.db` file and a `memories` table if it doesn't exist, using the fields from 1.1
- `insert_memory(memory: dict) -> str` — writes one row, returns memory_id
- `get_by_task(task_id: str) -> list`
- `get_by_agent(agent_id: str, project_id: str) -> list`
- `get_decisions(project_id: str, task_id: str = None) -> list` — filters `memory_type == "decision"`

**Why SQLite here specifically:** this is for exact-match lookups (give me everything for task X). It's a single file, needs zero setup, and is easy to debug by just opening `data/memory.db` in any SQLite viewer.

Test it standalone before moving on:
```
uv run python -c "from backend.sqlite_store import init_db, insert_memory; init_db(); print(insert_memory({'content':'test','memory_type':'fact','agent_id':'a','task_id':'t','project_id':'p','importance':0.5}))"
```
You should see a memory_id printed with no errors.

### Step 1.3 — `backend/vector_store.py`
This is where memory gets stored for *meaning-based* search.

```
touch backend/vector_store.py
```

Build functions:
- `init_vector_store()` — creates/opens a persistent ChromaDB collection in `data/chroma/`
- `add_memory(memory: dict)` — embeds `content` using `sentence-transformers` and adds it to the Chroma collection, tagging it with `project_id`, `task_id`, `agent_id`, `memory_type` as metadata
- `semantic_search(query: str, project_id: str, task_id: str = None, limit: int = 5) -> list` — searches Chroma, filters by project_id (and task_id if given)

**Why this is separate from sqlite_store.py:** SQLite finds things by exact field match. Chroma finds things by *meaning*. Agent B asking "what database did we pick" needs meaning-based search — that's this file's whole job.

Test standalone:
```
uv run python -c "from backend.vector_store import init_vector_store, add_memory, semantic_search; init_vector_store(); add_memory({'content':'Chose ChromaDB for vector storage','memory_type':'decision','agent_id':'a','task_id':'t1','project_id':'p1','importance':0.9}); print(semantic_search('what vector database did we choose', 'p1'))"
```
You should see your memory come back even though the query words don't exactly match the content.

### Step 1.4 — `backend/memory_engine.py`
This ties 1.2 and 1.3 together — it's the single place other code talks to.

```
touch backend/memory_engine.py
```

Build functions that match the MCP tool list in ARCHITECTURE.md §7:
- `remember(content, memory_type, project_id, task_id, agent_id, importance=0.5)` — writes to BOTH sqlite_store and vector_store, returns memory_id
- `recall(query, project_id, task_id=None, limit=5)` — calls vector_store.semantic_search
- `get_task_memory(task_id)` — calls sqlite_store.get_by_task, groups results by memory_type
- `get_decisions(project_id, task_id=None)` — calls sqlite_store.get_decisions
- `get_agent_history(agent_id, project_id)` — calls sqlite_store.get_by_agent
- `store_result(task_id, result, agent_id, project_id)` — shortcut that calls remember() with memory_type="result"
- `handoff_task(task_id, from_agent, to_agent, summary, next_steps)` — stores an `event` memory describing the handoff

**Why one engine file instead of agents calling sqlite_store/vector_store directly:** if you ever need to change how storage works, you change it in ONE place. Nothing outside this file should know SQLite or Chroma even exist.

### Step 1.5 — `backend/mcp_server.py`
This is the actual MCP server — the product. It exposes memory_engine's functions as MCP tools any AI agent can call.

```
touch backend/mcp_server.py
```

Use `FastMCP` from the `mcp` package. Roughly:

```python
from mcp.server.fastmcp import FastMCP
from backend import memory_engine

mcp = FastMCP("shared-agent-memory")

@mcp.tool()
def remember(content: str, memory_type: str, project_id: str, task_id: str, agent_id: str, importance: float = 0.5) -> str:
    """Store a new memory so other agents can find it later."""
    return memory_engine.remember(content, memory_type, project_id, task_id, agent_id, importance)

@mcp.tool()
def recall(query: str, project_id: str, task_id: str = None, limit: int = 5) -> list:
    """Search memory by meaning — find what other agents already know about a topic."""
    return memory_engine.recall(query, project_id, task_id, limit)

# ...repeat for get_task_memory, get_decisions, get_agent_history, store_result, handoff_task

if __name__ == "__main__":
    mcp.run()
```

**Why the docstrings matter a lot here:** the AI agent connecting to this server reads these docstrings to decide when to use each tool. Write them like instructions to a new coworker, not like code comments.

**Test the whole server by itself before anyone else builds on it:**
```
uv run backend/mcp_server.py
```
It should start and wait, with no errors. Then test it with the MCP inspector (comes with the SDK):
```
uv run mcp dev backend/mcp_server.py
```
Manually call `remember` and `recall` from the inspector UI to confirm the full pipeline works end-to-end.

### §1 — Push checkpoint
Once `mcp dev` works and you can remember/recall manually:
```
git add backend/
git commit -m "Member 1: memory engine + MCP server working end-to-end"
git push
```
**Tell the team in your group chat the moment this is pushed** — Members 2 and 3 are blocked until this exists.

---

## §2 — MEMBER 2: Research Agent (first half of the demo)

**Wait for Member 1's §1 push before starting Step 2.2.** You can do Step 2.1 in parallel before that.

### Step 2.1 — `agents/llm_client.py`
One function. This is the only place that talks to the DeepSeek API — every agent script imports this instead of calling the API directly.

```
touch agents/llm_client.py
```

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

def ask_llm(prompt: str, system: str = "You are a helpful AI agent.") -> str:
    """Send a prompt to DeepSeek and return its text response."""
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content
```

**Why one shared function:** if the API changes or you swap models later, you fix it in one place, not in every agent file.

Test it:
```
uv run python -c "from agents.llm_client import ask_llm; print(ask_llm('Say hello in 5 words'))"
```

### Step 2.2 — `agents/research_agent.py`
This is a LangGraph agent that plays the role of "Research Agent" in the demo. Its job: get a task, "research" it using the LLM, then WRITE what it found into the shared memory via MCP.

```
touch agents/research_agent.py
```

Build a simple LangGraph graph with these nodes:
1. `think` node — calls `ask_llm()` with a prompt describing the task (use the exact prompt template in §5 below)
2. `store_memory` node — takes the LLM's output and calls the MCP server's `remember()` and `store_result()` tools (connect as an MCP client — the `mcp` package's client utilities let you call a running server's tools directly)

**Why LangGraph for something this small:** it's overkill for 2 nodes, but it's consistent with Member 3's agents, and it makes adding a 3rd/4th step later (if you have time) trivial — you just add a node.

**Explain like I'm new — what is this script actually doing when you run it?**
It runs once, top to bottom: ask the LLM to "research," take that answer, save it as memories in the shared server, then exit. That's it. It's not a long-running chatbot.

Run it like this once Member 1's server is live:
```
uv run python agents/research_agent.py
```

### §2 Prompt to give the LLM (put this directly in your code as the prompt)
See §5 "Agent Prompts" at the bottom of this file — use the **Research Agent prompt** exactly, don't improvise it live during the hackathon; a consistent prompt = a demo that doesn't randomly break.

### §2 — Push checkpoint
Once `research_agent.py` runs cleanly and you can see the memory it wrote (ask Member 1 to confirm via SQLite or the inspector):
```
git add agents/llm_client.py agents/research_agent.py
git commit -m "Member 2: research agent stores memory via MCP"
git push
```

---

## §3 — MEMBER 3: Coding Agent + Testing Agent (second half of the demo)

**Wait for Member 1's §1 push before starting.** You can read ARCHITECTURE.md and plan in the meantime.

### Step 3.1 — `agents/coding_agent.py`
This agent's whole point is proving the concept: it must **recall** the Research Agent's decision BEFORE doing its own work, and its output must explicitly reference what it found.

```
touch agents/coding_agent.py
```

LangGraph nodes:
1. `recall_memory` node — calls the MCP server's `recall()` tool with a query like `"vector database decision"`, and also `get_task_memory()` for full context
2. `think` node — calls `ask_llm()` with a prompt that includes what was recalled (use the **Coding Agent prompt** in §5 — it explicitly tells the LLM to reference the prior decision)
3. `store_memory` node — calls `remember()` and `store_result()` for its own output

**Why recall has to happen FIRST, before think:** this is the entire point of the project. If you call `think` before `recall`, you've just built a regular agent with no memory sharing — that's not the demo.

Run once Member 2 has already run `research_agent.py` and it stored something:
```
uv run python agents/coding_agent.py
```

### Step 3.2 — `agents/testing_agent.py`
Same pattern as coding_agent.py but simpler — it just needs to call `get_task_memory()` and summarize everything that's been done, proving that by the 3rd agent, a full history exists.

```
touch agents/testing_agent.py
```

### §3 — Push checkpoint
```
git add agents/coding_agent.py agents/testing_agent.py
git commit -m "Member 3: coding + testing agents, both recall before acting"
git push
```

---

## §4 — MEMBER 4 (OpenCode/DeepSeek, web designer): Dashboard

**You can start this immediately — you do NOT need to wait for anyone else.** Build against fake/sample data first, swap to real data later. This is the one part of the project that's normal web dev, not AI — you already know how to do most of this.

### Step 4.1 — Fake data first
Before the backend exists, write a fake JSON file so you can build the UI without being blocked:
```
mkdir -p dashboard
touch dashboard/sample_data.json
```
Put 5-6 fake memory entries in it matching the shape in ARCHITECTURE.md §6, so you can build against something real-looking.

### Step 4.2 — `dashboard/api.py`
A tiny FastAPI app with **read-only** endpoints. It does not create memories — only reads them, for display.

```
touch dashboard/api.py
```

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend import sqlite_store  # once Member 1's file exists

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"])

@app.get("/api/memories")
def all_memories():
    # once backend/sqlite_store.py exists, query all rows here
    ...

@app.get("/api/timeline")
def timeline():
    # same data, sorted by timestamp, for the live feed view
    ...
```

Run it:
```
uv run uvicorn dashboard.api:app --reload --port 8000
```

### Step 4.3 — Frontend
```
cd dashboard
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm run dev
```

Build a page with 3 sections (matches ARCHITECTURE.md §8 demo scenario):
1. **Active Agents** — small list/cards (research_agent, coding_agent, testing_agent) with a status dot
2. **Live Event Timeline** — scrolling list, newest at top, polling `/api/timeline` every 2 seconds
3. **Memory Detail** — click a timeline entry to expand and see full content, memory_type, and which agent created it

Keep styling simple and clean — dark background, monospace font for the timeline reads well for a "system internals" feel. This does not need to be fancy, it needs to be **legible from the back of a room** during a demo.

### §4 — Push checkpoints (push twice — once with fake data working, once with real data wired in)
```
git add dashboard/
git commit -m "Member 4: dashboard UI working against sample data"
git push
```
Then later, once Member 1's SQLite file is real and populated:
```
git add dashboard/api.py
git commit -m "Member 4: dashboard wired to real memory data"
git push
```

---

## §5 — Agent Prompts (use these exactly, don't wing it live)

**Research Agent prompt** (used in `agents/research_agent.py`):
```
You are a Research Agent working on a shared team project. Your task is:
"Research the best storage approach for a shared AI agent memory system, comparing at least 2 options."

Give a short comparison (3-4 sentences) and then clearly state your final decision in this format:
DECISION: <what you chose>
REASON: <why, in one sentence>

Keep your entire answer under 150 words.
```

**Coding Agent prompt** (used in `agents/coding_agent.py` — note it includes recalled memory):
```
You are a Coding Agent working on the same shared team project as other agents.
Before starting, here is what a previous agent already discovered and decided:

{recalled_memories}

Your task is: "Describe how you would implement the memory storage layer, given the above decision."
You MUST explicitly reference the previous agent's decision by name in your first sentence — do not repeat their research, build on it.
Keep your entire answer under 150 words.
```

**Testing Agent prompt** (used in `agents/testing_agent.py`):
```
You are a Testing Agent working on the same shared team project as other agents.
Here is the full history of what has been done on this task so far:

{full_task_memory}

Summarize what has been built and confirm whether the work is ready for testing, in under 100 words.
Reference at least the research decision and the implementation approach by name.
```

**Why these prompts are locked in advance:** during a live demo you want repeatable output, not the LLM going off in a random direction because someone tweaked the prompt at 2am. Write these into the code now, don't change them after they work.

---

## §6 — Final Integration (all 4, together, once §1-§4 are all pushed)

1. Everyone pulls:
   ```
   git pull
   ```
2. Member 1 starts the MCP server in one terminal:
   ```
   uv run backend/mcp_server.py
   ```
3. Member 4 starts the dashboard backend and frontend in two more terminals:
   ```
   uv run uvicorn dashboard.api:app --reload --port 8000
   ```
   ```
   cd dashboard/frontend && npm run dev
   ```
4. Open the dashboard in a browser, leave it visible.
5. In order, in a 4th terminal, run:
   ```
   uv run python agents/research_agent.py
   uv run python agents/coding_agent.py
   uv run python agents/testing_agent.py
   ```
6. Watch the dashboard update after each one. Confirm the Coding Agent's output actually references the Research Agent's decision — that's the moment that proves the whole idea. If it doesn't, that's the bug to fix before anything else.

7. Final push:
   ```
   git add .
   git commit -m "full end-to-end demo working"
   git push
   ```

8. **Rehearse the demo out loud at least once** before presenting — decide who talks while which terminal runs, and who explains the dashboard.

---

## §7 — If You Run Out of Time (cut list, in order)

Cut things in this order if the clock runs out — don't cut anything before it:

1. Cut `handoff_task()` — just don't call it, `remember`/`recall` alone still prove the concept.
2. Cut the "Testing Agent" — 2 agents (research → coding) is still a valid demo.
3. Cut fancy dashboard styling — a plain list of timeline entries still proves it works.
4. Do NOT cut: the MCP server itself, `remember`/`recall`, or the moment where Coding Agent visibly uses Research Agent's memory. That's the entire product.
