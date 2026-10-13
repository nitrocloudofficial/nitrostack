# Shared Agent Memory MCP — Architecture Blueprint

Read this whole file before writing any code. It explains **what** we are building, **why** each piece exists, and **how** the pieces connect. If you're new to AI agents, read the "Explain Like I'm New" boxes — they're for you.

---

## 1. The One-Sentence Pitch

> **Shared Agent Memory MCP** is a server that gives different AI agents a common, persistent memory — so if Agent A researches something and finishes, Agent B (a totally different agent, maybe even a different AI model) can pick up exactly where Agent A left off, without repeating the work.

Judges should walk away remembering: *"connect one server, your agents stop forgetting each other's work."*

---

## 2. What We Are NOT Building

So there's no confusion on the team:

- ❌ **Not a chatbot.** No chat window where a human types messages.
- ❌ **Not a mobile app or website users log into.**
- ❌ **Not the Digital Organism idea.** That was a different concept we're not doing this hackathon.
- ❌ **Not a single AI agent doing one task.** The whole point is *multiple* agents sharing memory.

## 3. What We ARE Building

Two things:

1. **An MCP server** (this is the actual product). MCP stands for **Model Context Protocol** — it's a standard way for AI agents (like Claude Code, Cursor, or a custom Python agent) to call "tools" that live outside of them. Think of it like a plugin system: any AI agent that "speaks MCP" can connect to our server and use its memory tools (`remember`, `recall`, etc.) the same way it uses a calculator or a search tool.
2. **A read-only dashboard** (a browser page) that shows judges what's happening inside the memory in real time — agents connecting, memories being written, one agent picking up another's work. The dashboard is NOT how the system is used. It's just a window into it, for the demo.

**EXPLAIN LIKE I'M NEW — what does "agent" mean here?**
An "agent" in this project is just an AI (Claude, or DeepSeek, or any model) running a small Python script in a loop: it gets a task, thinks, calls some tools, does work, and stops. We are going to build 3 tiny demo agents (Research Agent, Coding Agent, Testing Agent) that all connect to the SAME memory server. That's the whole demo.

---

## 4. The Stack (and why each piece)

| Piece | Tool | Why this and not something else |
|---|---|---|
| Package manager | `uv` | Already decided by the team — fast, simple lockfile |
| MCP server framework | `mcp` (official Python SDK, `FastMCP`) | This is *the* standard SDK for building MCP servers. Don't hand-roll the protocol. |
| Agent orchestration | `langgraph` | We need agents that hand off work to each other in steps (research → code → test). LangGraph is built exactly for stateful, multi-step, multi-agent flows with explicit handoff. LangChain is more for single linear chains — not what we need. LangSmith is just a debugging/tracing dashboard for LangChain/LangGraph; skip it, we don't have time to wire it up and it's not required for the demo. |
| Structured memory storage | `SQLite` (via Python's built-in `sqlite3`, no separate install) | Stores tasks, decisions, agent history, metadata — anything we query by exact fields (task_id, agent_id, timestamps). Zero setup, it's just a file. |
| Semantic memory storage | `ChromaDB` | This is our vector database. It lets us search memory by **meaning**, not exact keywords — e.g. searching "what database did we pick" finds a memory that says "Qdrant was selected for vector storage" even though the words don't match exactly. |
| Embeddings (turns text into searchable vectors) | `sentence-transformers` (local model `all-MiniLM-L6-v2`) | Free, runs on your laptop, no API key, no cost, no internet dependency during the demo. This is what makes Chroma's search "understand meaning." |
| LLM calls for agents | DeepSeek API (`openai`-compatible client) for Members 2, 3, 4 | Free tier for most of the team, no one blocked on API cost |
| Tooling for the core MCP server | Claude Code (subscription), used by Member 1 only | The MCP server is the hardest, most failure-prone part and the piece everyone else is blocked on — it gets the strongest model. The dashboard and agent scripts are simpler and more forgiving on the free tier. |
| Dashboard backend | `FastAPI` + `uvicorn` | Lightweight, serves a couple of read-only JSON endpoints for the dashboard to poll |
| Dashboard frontend | Plain React (or even plain HTML+JS if time is short) | Web designer teammate builds this — just needs to display data, no AI logic |

**EXPLAIN LIKE I'M NEW — what's a "vector database" in one sentence?**
A normal database finds rows that match exact words. A vector database turns text into a list of numbers (a "vector") that captures its *meaning*, and finds other pieces of text with similar meaning — even if the words are different.

---

## 5. System Diagram

```
        AI AGENT A                    AI AGENT B
     (Research Agent,              (Coding Agent,
      built in LangGraph)           built in LangGraph)
            │                              │
            │  MCP tool calls              │  MCP tool calls
            ▼                              ▼
     ┌──────────────────────────────────────────┐
     │            SHARED MEMORY MCP SERVER        │
     │  (backend/mcp_server.py — built on FastMCP) │
     │                                              │
     │   Tools exposed:                            │
     │   - remember()                              │
     │   - recall()                                │
     │   - get_task_memory()                       │
     │   - get_decisions()                         │
     │   - get_agent_history()                     │
     │   - store_result()                          │
     │   - handoff_task()                          │
     └───────────────────┬──────────────────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │     Memory Engine       │
              │  (backend/memory_engine.py) │
              │  - decides what goes where  │
              │  - talks to both stores     │
              └───────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
     ┌─────────────────┐      ┌─────────────────────┐
     │  SQLite           │      │  ChromaDB (vector)   │
     │  tasks, decisions,│      │  semantic search      │
     │  agent history,    │      │  over memory content   │
     │  artifacts, meta   │      │                         │
     └─────────────────┘      └─────────────────────┘
                           ▲
                           │  reads only (polling)
                           │
              ┌────────────────────────┐
              │  FastAPI dashboard API   │
              │  (dashboard/api.py)       │
              └───────────┬────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  React dashboard page    │
              │  (dashboard/frontend/)    │
              │  — shown to judges         │
              └────────────────────────┘
```

---

## 6. The Memory Model (what actually gets stored)

Every memory has these fields, no matter what type it is:

```json
{
  "memory_id": "mem_001",
  "content": "Qdrant was selected as the vector database",
  "memory_type": "decision",
  "agent_id": "research_agent",
  "task_id": "task_123",
  "project_id": "demo_project",
  "timestamp": "2026-07-31T14:00:00",
  "importance": 0.9
}
```

We support 4 `memory_type` values (keep it simple, don't over-build):

1. **`fact`** — something learned that stays true (e.g. "backend is written in Python")
2. **`decision`** — a choice made and why (e.g. "chose Qdrant because it's free and local")
3. **`event`** — something that happened (e.g. "research agent tested 3 databases")
4. **`result`** — the final output of a completed task

**EXPLAIN LIKE I'M NEW — why separate types instead of one big list of text?**
So that when Agent B asks "what did we decide about the database," we can search *just* the decisions instead of every random thing that happened. It's like having labeled folders instead of one giant pile of paper.

---

## 7. The MCP Tools (exact function signatures)

These live in `backend/mcp_server.py`. Every one of these is something an AI agent can call.

```python
remember(content: str, memory_type: str, project_id: str, task_id: str, agent_id: str, importance: float = 0.5) -> str
# Stores a new memory. Returns the memory_id.

recall(query: str, project_id: str, task_id: str = None, limit: int = 5) -> list
# Semantic search — finds memories related in MEANING to the query text.

get_task_memory(task_id: str) -> dict
# Returns everything known about one task: facts, decisions, events, results.

get_decisions(project_id: str, task_id: str = None) -> list
# Returns just the decision-type memories, with their reasons.

get_agent_history(agent_id: str, project_id: str) -> list
# Returns everything a specific agent has done before.

store_result(task_id: str, result: str, agent_id: str) -> str
# Stores the final output of a task. Shortcut for remember() with memory_type="result".

handoff_task(task_id: str, from_agent: str, to_agent: str, summary: str, next_steps: str) -> str
# Marks a task as handed off, with a summary so the next agent doesn't have to recall() from scratch.
```

That's it. 7 tools. Do not add more before the demo works end-to-end.

---

## 8. The Demo Scenario (what we show judges)

1. **Research Agent** runs (LangGraph script). Task: "Research the best vector database for a memory system."
   - It "researches" (can literally be a canned/simplified reasoning step — doesn't need real internet search for a hackathon).
   - It calls `remember()` to store: the options it considered (fact), its decision to use ChromaDB and why (decision), and calls `store_result()`.
   - It disconnects.

2. **Coding Agent** runs (separate process, separate script). Task: "Implement the memory layer."
   - Before doing anything, it calls `recall("vector database decision")`.
   - The server returns the Research Agent's decision.
   - The Coding Agent's output/response explicitly references it: "Using ChromaDB as decided by research_agent because it's free and local — proceeding with implementation."
   - It calls `remember()` to store what it built, then `store_result()`.

3. **Testing Agent** runs. Task: "Test the memory system."
   - Calls `get_task_memory()` to see everything done so far.
   - Reports back referencing both previous agents' work.

4. **Dashboard**, open the whole time, shows a live timeline:
   ```
   14:00  research_agent stored decision: "ChromaDB selected"
   14:01  research_agent disconnected
   14:03  coding_agent connected
   14:03  coding_agent recalled 3 memories
   14:04  coding_agent stored result
   14:06  testing_agent retrieved full task memory
   ```

This is the entire demo. Nothing fancier is required to win — a flawless version of this is stronger than a half-broken bigger idea.

---

## 9. Folder Structure (exact — don't deviate, so no one's imports break)

```
shared-agent-memory-mcp/
│
├── .env                          # API keys (NEVER commit this)
├── .env.example                  # template, safe to commit
├── .gitignore
├── pyproject.toml                # created by `uv init`
├── README.md
│
├── backend/
│   ├── __init__.py
│   ├── mcp_server.py             # Member 1 — the MCP tool interface
│   ├── memory_engine.py          # Member 1 — core storage/retrieval logic
│   ├── memory_models.py          # Member 1 — data structures (the memory dict shape)
│   ├── sqlite_store.py           # Member 1 — SQLite read/write
│   └── vector_store.py           # Member 1 — ChromaDB read/write
│
├── agents/
│   ├── __init__.py
│   ├── llm_client.py             # Member 2 — one function, calls DeepSeek, returns text
│   ├── research_agent.py         # Member 2 — LangGraph agent 1
│   ├── coding_agent.py           # Member 3 — LangGraph agent 2
│   └── testing_agent.py          # Member 3 — LangGraph agent 3
│
├── dashboard/
│   ├── api.py                    # Member 4 (with help) — FastAPI read-only endpoints
│   └── frontend/                 # Member 4 — React dashboard
│       └── (created by vite)
│
└── data/
    ├── memory.db                 # SQLite file (auto-created, gitignored)
    └── chroma/                   # ChromaDB folder (auto-created, gitignored)
```

---

## 10. Build Order (the order things must happen in)

This matters because Member 2, 3, and 4 all depend on Member 1's work existing first.

```
Phase 0 (everyone, together, first 20 min):
    repo setup, uv init, install shared deps, agree on folder structure

Phase 1 (Member 1 ONLY — everyone else waits/preps):
    memory_models.py → sqlite_store.py → vector_store.py → memory_engine.py

Phase 2 (Member 1):
    mcp_server.py — wraps memory_engine in MCP tools
    Member 1 tests it manually before anyone else builds on top

Phase 3 (Member 2, once Phase 2 is pushed):
    llm_client.py → research_agent.py

Phase 3 (Member 3, once Phase 2 is pushed):
    coding_agent.py → testing_agent.py

Phase 4 (Member 4, can start MUCH earlier — doesn't depend on backend):
    dashboard/api.py stub with fake data → real frontend →
    swap fake data for real data once Member 1's SQLite file exists

Phase 5 (everyone):
    full run-through: research_agent → coding_agent → testing_agent → check dashboard

Phase 6 (everyone):
    fix bugs found in the run-through, rehearse the demo out loud
```

See `task.md` for exact per-person steps, commands, and prompts.
