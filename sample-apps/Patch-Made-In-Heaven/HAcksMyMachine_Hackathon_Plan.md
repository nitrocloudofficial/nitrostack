# HAcksMyMachine — Hackathon Plan
> **Track:** Enterprise AI & Workplace Automation — Nitrostack Hackathon  
> **Tagline:** *AI agents forget everything. HAcksMyMachine is their permanent, verified memory.*

---

## 1. The Problem

Every AI agent starts from zero.

When Cursor, Claude, or Copilot hits an error — a cryptic ImportError, a broken Docker config, a version conflict nobody documents — it reasons from scratch. Every time. Even if 500 other agents already solved the exact same problem yesterday.

This wastes:
- Compute
- API tokens
- Developer time
- Trust in AI tooling

There is no shared memory. No collective intelligence. No way for one agent's hard-won solution to benefit the next.

**HAcksMyMachine fixes that.**

---

## 2. What HAcksMyMachine Does

HAcksMyMachine is a **shared, execution-verified knowledge base** that any AI agent can query via MCP.

When an agent hits a problem:
1. It searches HAcksMyMachine first
2. If a verified solution exists → returned instantly, no reasoning required
3. If not → agent solves it, the solution is verified in a sandbox, stored, and made available to every future agent

Over time, HAcksMyMachine becomes smarter with every agent that uses it. **Collective intelligence, not isolated reasoning.**

---

## 3. The Core Pipeline

```
Agent encounters a problem
         │
         ▼
  Search HAcksMyMachine
         │
    ┌────┴────┐
    │         │
  Found     Not Found
    │         │
    ▼         ▼
 Return    Agent reasons
 verified  & solves it
 solution       │
                ▼
         Run in sandbox
                │
           ┌────┴────┐
           │         │
         PASS       FAIL
           │         │
           ▼      Discard
     Store solution
     + logs + patch
     + environment
           │
           ▼
  Future agents reuse it
```

That is the entire product. Everything else serves this loop.

---

## 4. MCP Tools (What You'll Build)

```
HAcksMyMachine MCP Server
│
├── search_fix(stacktrace, language, framework, package_versions)
│     Hybrid search: BM25 keyword + dense vector + reranker
│     Returns: ranked list of verified fixes with confidence scores
│
├── find_by_error(error_type, message)
│     Input: TypeError / ImportError / Segmentation fault / etc.
│     Returns: verified fixes sorted by success rate
│
├── find_similar(problem_description)
│     Embedding-based semantic search
│     Returns: related fixes even without exact error match
│
├── submit_fix(problem, patch, environment, explanation)
│     Stores a candidate fix
│     Triggers sandbox verification automatically
│     Returns: submission ID + verification status
│
├── verify_fix(submission_id)
│     Runs the fix in an isolated sandbox (Docker)
│     Returns: PASS / FAIL + full execution log
│
├── get_patch(fix_id)
│     Returns: unified diff of the verified fix
│
├── get_execution_log(fix_id)
│     Returns: the actual verified run — stdout, stderr, exit code
│
└── list_related_fixes(fix_id)
      Returns: fixes that address similar problems
      Very useful for agents exploring solution space
```

---

## 5. What Gets Stored Per Fix

Not just an answer. A full execution record:

```
┌─────────────────────────────────┐
│         Knowledge Card          │
├─────────────────────────────────┤
│ Error Type    ImportError       │
│ Language      Python 3.11       │
│ Framework     FastAPI 0.104     │
│ Package Vers  pydantic==2.4.2   │
├─────────────────────────────────┤
│ Problem       Description       │
│ Environment   Full snapshot     │
│ Patch         Unified diff      │
│ Execution     Logs + runtime    │
│ Verified      ✅ Yes            │
│ Success Rate  97%               │
│ Reused by     512 agents        │
│ Last verified 2 hours ago       │
│ Confidence    0.94              │
│ Embeddings    Stored            │
└─────────────────────────────────┘
```

This is what makes retrieval dramatically better than any existing solution. You're not storing an answer — you're storing a **verified execution context**.

---

## 6. What You Are NOT Building

Stay ruthlessly focused:

- ❌ No voting system (this isn't Reddit)
- ❌ No public discussions (this isn't Stack Overflow)
- ❌ No user profiles or reputation
- ❌ No social feed
- ❌ No Fetch.ai / decentralized agent discovery
- ❌ No RunPod / GPU infrastructure
- ❌ No Elastic AI Builder (use raw Elasticsearch directly)

Every one of these adds complexity with zero demo value. The judges care about the **loop working**, not the features list.

---

## 7. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| MCP Framework | NitroStack (TypeScript) | Deployment, tooling, auth — all handled |
| Search | Elasticsearch | BM25 + vector search + reranking in one system |
| Sandbox | Docker (local) | Verification without Modal complexity |
| Embeddings | OpenAI / Ollama | For semantic `find_similar` |
| LLM | Claude 3.5 Sonnet | Reasoning on unsolved problems |
| Dashboard | Next.js + React | Simple read-only view of knowledge cards |
| Deployment | NitroCloud | One-command live deploy |

### Why Elasticsearch Over Anything Else

Your product IS search. Elasticsearch gives you three search modes in one system:
- **BM25** — keyword matching on error messages
- **Dense vectors** — semantic similarity on problem descriptions
- **RRF reranking** — fuses both signals for best results

No other tool gives you all three without stitching multiple services together.

### Why Docker Over Modal

Modal is interesting but adds a signup, a billing account, and a new SDK to learn. For the hackathon, Docker containers give you identical sandboxing with zero external dependency. Ship Modal in V2.

---

## 8. The Cold Start Problem (Critical)

**This is the thing that will kill your demo if you ignore it.**

On demo day you have zero solutions in the database. An empty knowledge base demonstrates nothing.

**Fix this before writing a single line of MCP code:**

Spend 2–3 hours pre-seeding 50–80 real verified fix entries. Use these categories:

```
Python errors (20 entries)
  - ImportError: cannot import name X from Y
  - ModuleNotFoundError: No module named 'X'
  - Pydantic v1 vs v2 migration errors
  - FastAPI dependency injection issues

Node.js errors (15 entries)
  - Cannot find module errors
  - ESM vs CommonJS conflicts
  - TypeScript compilation errors

Docker errors (15 entries)
  - Port binding conflicts
  - Volume mount permission issues
  - Multi-stage build failures

General (10 entries)
  - Dependency version conflicts
  - Environment variable missing errors
```

Pre-seed these as already-verified entries with realistic success rates and reuse counts. When a judge searches for a Python ImportError on demo day, it finds something. That's your wow moment.

---

## 9. Demo Flow (Hackathon Day)

### Setup (Before Judges Arrive)
- Database pre-seeded with 50+ verified fixes
- Claude Desktop connected to HAcksMyMachine MCP via NitroCloud URL
- Simple Next.js dashboard open in browser showing knowledge cards
- A second terminal ready to show sandbox verification live

### The Demo Sequence

**Step 1 — Set the scene (30 seconds)**
> *"Every AI agent starts from zero. Claude, Cursor, Copilot — they all re-solve the same problems from scratch, every single session. There's no shared memory. HAcksMyMachine changes that. It's a permanent, verified knowledge base that any AI agent can query."*

**Step 2 — The hit (cache hit)**
- In Claude Desktop: *"I'm getting ImportError: cannot import name 'BaseSettings' from 'pydantic' in my FastAPI app"*
- Watch HAcksMyMachine MCP return the verified fix instantly
- Show the knowledge card — success rate, times reused, execution log
- Point out: **no reasoning happened. No tokens burned. Instant.**

**Step 3 — The miss (cache miss + verification)**
- Submit a problem that isn't in the database
- Watch the agent reason through it
- Show the Docker sandbox running live in the terminal
- Show PASS + logs
- Refresh the dashboard — new knowledge card appears
- Say: *"That fix is now available to every agent that hits this problem next."*

**Step 4 — The kicker**
- Ask a different Claude session (or Cursor) to query the same problem
- It finds it instantly
- Say: *"Two different agents. Two different tools. One shared memory."*

---

## 10. Deployment on NitroCloud

### Why NitroCloud

Purpose-built for MCP servers. For a hackathon:
- One-command deploy
- Automatic HTTPS + public URL
- Free tier, no credit card needed
- Auto-scaling built in
- Zero DevOps overhead

### Local Development

```bash
# Install NitroStack CLI
npm install -g @nitrostack/cli

# Scaffold the project
nitrostack init hacksmymachine-mcp

# Start local dev server
cd hacksmymachine-mcp
npm run dev
```

Test every tool locally in **NitroStudio** — the desktop app that gives you a visual tool inspector and chat interface connected to your local MCP server. Test `search_fix`, `submit_fix`, and `verify_fix` before you touch deployment.

### Going Live

```bash
# Login to NitroCloud
nitrostack login

# Deploy
nitrostack deploy
```

NitroCloud returns a public HTTPS URL immediately. Point any MCP client at it.

### Environment Variables

Set these before deploying:

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...          # For embeddings
ELASTICSEARCH_URL=https://...
ELASTICSEARCH_API_KEY=...
```

NitroCloud handles secret injection — never hardcode credentials.

### Connecting to Claude Desktop

Once deployed, add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hacksmymachine": {
      "url": "https://your-hacksmymachine.nitrocloud.ai/mcp",
      "transport": "http"
    }
  }
}
```

Now Claude Desktop, Cursor, VS Code — any MCP client — can query HAcksMyMachine natively.

### Elasticsearch Setup

For the hackathon, use **Elastic Cloud free tier** (14-day trial, no card needed):

```bash
# Create index with hybrid search mapping
PUT /hacksmymachine-fixes
{
  "mappings": {
    "properties": {
      "problem": { "type": "text" },
      "error_type": { "type": "keyword" },
      "language": { "type": "keyword" },
      "framework": { "type": "keyword" },
      "patch": { "type": "text" },
      "verified": { "type": "boolean" },
      "success_rate": { "type": "float" },
      "reuse_count": { "type": "integer" },
      "embedding": {
        "type": "dense_vector",
        "dims": 1536,
        "index": true,
        "similarity": "cosine"
      }
    }
  }
}
```

---

## 11. Build Order (48h Hackathon)

```
Hour 0–2    Scaffold NitroStack project
            Set up Elasticsearch index
            Pre-seed database with 50 entries (DO THIS FIRST)

Hour 2–6    Build search_fix + find_by_error
            Wire to Elasticsearch BM25 search
            Test in NitroStudio

Hour 6–10   Add vector embeddings to search_fix
            Build find_similar with semantic search
            Test hybrid search quality

Hour 10–14  Build submit_fix
            Build verify_fix with Docker sandbox
            Integration test the full loop

Hour 14–16  Build get_patch + get_execution_log + list_related_fixes
            These are read-only, fast to build

Hour 16–18  Deploy to NitroCloud
            Connect Claude Desktop
            Full end-to-end test on live deployment

Hour 18–22  Build simple Next.js dashboard
            Knowledge cards view (read-only is fine)
            Make it look good for judges

Hour 22–24  Pre-seed more entries (aim for 80 total)
            Rehearse demo flow 3 times
            Prepare the "miss" scenario for live verification demo
```

---

## 12. The Pitch (One Paragraph)

> *"Every AI agent starts from zero. Claude, Cursor, Copilot — they all re-solve the same problems from scratch, burning compute and tokens, every single session. HAcksMyMachine is the shared memory layer they're missing. It's an MCP server exposing a hybrid-search knowledge base where every solution is execution-verified in a real sandbox before it's stored. When an agent hits an error, it queries HAcksMyMachine first. If the fix exists and is verified, it's returned instantly — no reasoning, no tokens burned. If it doesn't exist, the agent solves it, we verify it in Docker, store it, and every future agent benefits. It's not another AI assistant. It's the memory that makes all AI assistants smarter over time."*

---

## 13. Why This Wins

| Dimension | Assessment |
|---|---|
| Originality | Nobody has built verified shared agent memory |
| MCP fit | MCP is genuinely the right transport — any client benefits |
| Demo story | Cache hit → Cache miss → Verification → Reuse is a complete narrative arc |
| Enterprise angle | Reduces token costs, speeds up dev cycles, measurable ROI |
| Technical depth | Hybrid search + sandbox verification is real engineering |
| Long-term vision | Gets smarter with every agent that uses it — network effects |

---

## 14. V2 Roadmap (Post-Hackathon)

Once the core loop is solid:

1. **Modal sandbox** — more isolated than Docker, better for untrusted code
2. **GitHub MCP integration** — fetch issues and PRs as problem context automatically
3. **Stack Overflow MCP** — bootstrap knowledge base from existing verified answers
4. **Org-private instances** — enterprise teams with private knowledge stores
5. **Agent SDK** — one-line integration for LangGraph, CrewAI, AutoGen agents
6. **Confidence decay** — solutions expire and get re-verified as dependencies update

---

*Built for the Nitrostack Hackathon · Track: Enterprise AI & Workplace Automation*
