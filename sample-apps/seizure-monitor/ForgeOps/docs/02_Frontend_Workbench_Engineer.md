# Role 2: Frontend / Decision Workbench Engineer

## Why this role exists
ForgeOps's core positioning is: **the visual Workbench is the product; the AI is the secondary interaction layer.** If your build is "a chat window with some charts," you've inverted the entire pitch. Your job is to make the factory evidence the star, and make the AI feel like it's *operating a real industrial tool*, not chatting in a void.

## Core mental model
Think "Git history + flight replay + causal graph + spreadsheet what-if," fused into one synchronized workspace. The critical UX property: **when the AI or the user selects anything, everything else in the workbench reacts in sync.** Selecting an event in the timeline highlights the matching node in the graph and the matching sensor chart. This synchronized-selection state is the hardest and most important thing you build.

## Deliverables (hackathon-scoped)

### 1. Home Dashboard
- Top-level production signals (yield, active incidents, KPI deltas)
- Recent alerts feed (e.g. "High humidity," "Conveyor delay," "Machine 7 vibration")
- Incident cards: severity, plant/line/batch, current state, clear CTA → "Open Decision Workbench"
- Filters: plant, line, shift, product, incident type, status
- Keep the assistant/chat visually secondary here — it becomes prominent only after an incident is opened

### 2. Incident Timeline (Module 1)
- Horizontal synchronized timeline — think Git commit history for a production run
- Events from multiple sources (sensor, queue, maintenance, inspection, operator notes, system actions) plotted on one sequence
- Filter by source/stage/severity/confidence
- Click an event → highlights related production stage, graph nodes, and evidence panel
- Compare mode: overlay this incident's timeline against a normal/successful batch
- Every event shows provenance on hover/click: source system, timestamp, asset, record ID

### 3. Replay Production (Module 2)
- Animated reconstruction of the batch through stages: raw material intake → Machine A → Machine B → inspection → packaging → failure point
- Transport controls: play, pause, restart, scrub, variable speed
- "Jump to" anomalies/alerts/state changes/quality failures
- Overlay toggle: healthy reference batch vs. simulated counterfactual run
- Click a stage → opens inputs/outputs/timestamps/sensor values/evidence for that stage
- "Pin" a moment — this locks the Root Cause Graph and the Copilot's context to that same point in time (this cross-module pinning is a key differentiator, don't skip it)

### 4. Root Cause Graph (Module 3)
- Node-link graph: operating conditions, delays, equipment, materials, environment → contributing factors → quality failure
- Visual encoding must distinguish: observed correlation vs. model-estimated influence vs. counterfactual evidence (use edge style, not just color — colorblind-safe)
- Click a node → opens supporting records, feature history, incident comparisons, sim results
- Ability to hide weak links / expand indirect paths / compare graph pre- vs. post-simulated-intervention
- Confidence indicator per node/edge (feed from Role 1/3's data)

### 5. What-if Simulator (Module 4)
- Controls for environmental (humidity, temp, pressure), process (dwell time, queue delay, cycle time, speed), equipment, material, and constraint variables
- Natural-language constraint input option (e.g. "we can't change suppliers for a month") — this routes to the Agent Service (Role 1)
- Output: predicted outcome vs. incident baseline, side-by-side comparison, cost/effort/confidence displayed together, not just the headline number

### 6. Recommendation Panel + Business Impact (Modules 5 & 6)
- Decision cards ranked by technical effectiveness, confidence, cost, speed, effort, business impact — not just "root cause found"
- Business Impact view: translate engineering choice into yield/downtime/cost outcomes leadership cares about, each with visible basis/confidence
- Human approval gate visible in the UI before any action executes (Notify Manager, create maintenance task, export report) — always show recipient, content, affected system before confirming

### 7. AI Engineer Assistant panel
- Docked assistant that: explains inclusion/exclusion of factors, shows its MCP tool-call sequence, controls the workbench (opens views, highlights events, filters evidence, compares scenarios), and offers contextual action buttons (Run comparison / Open evidence / Generate report)
- Response rendering rule: lead with the conclusion + quantified effect, make evidence references clickable, show assumptions/confidence, keep prose short — the workbench carries the depth, not the chat log

## The one thing that will make or break your demo
**Synchronized selection state.** Build a single shared "focus context" (e.g. `{ eventId, graphNodeId, stageId, timeRange }`) that every module reads from and writes to. When the AI says "show me the humidity evidence," it should just update this shared state — timeline, graph, and sensor chart all react automatically because they're subscribed to it. Build this shared state layer *before* you polish any individual module.

## Visual/interaction requirements from the blueprint (don't skip these)
- AI-driven focus should visually "glow" or highlight the relevant region and persist until dismissed or replaced by a new question
- Baseline vs. simulated data must be visually distinct (e.g. solid vs. dashed, consistent color coding across all modules)
- Progressive disclosure — don't show every data source at once
- Explicit loading / tool-progress / partial-data / failure states — never a silent blank panel
- Keyboard access + high-contrast alternative for graph/alert colors

## Recommended stack for a hackathon
- React (or your team's default) + a charting lib (Recharts/D3 for timeline & sensor charts) + a graph viz lib (react-force-graph, Cytoscape.js, or D3 force layout) for the Root Cause Graph
- Central state: React Context or Zustand for the shared "focus context" — avoid prop-drilling across 6 modules
- Keep Replay Production's animation simple: a scripted timeline scrubber driven by a static event array is enough; you don't need a physics engine

## Build order (suggested)
1. Shared focus-context state layer + basic routing/layout shell (Dashboard → Workbench)
2. Incident Timeline (this is your primary data spine — other modules key off event IDs from here)
3. Replay Production wired to the same event data
4. Root Cause Graph wired to the same focus context
5. What-if Simulator UI (can start against mocked static responses before Role 3's engine is ready)
6. Recommendation Panel + Business Impact
7. AI Assistant panel last — it should mostly just be "read/write the shared state + render Role 1's JSON contract," so it's fast once the modules exist

## Interfaces you own with teammates
- **With Role 1 (MCP/Agent)**: consume their structured response contract (conclusion, confidence, evidence_refs, assumptions, actions_available) and map `evidence_refs` to your component IDs
- **With Role 3 (Simulation/Data)**: agree on the batch/event/machine data schema early so your Timeline and Replay modules aren't rebuilt when their data model changes

## What "done" looks like for the demo
A judge can click through: Dashboard → open incident → scrub Replay → click a graph node → run a what-if → see a ranked recommendation with business impact — all without a single dead click, and with the AI assistant visibly driving 2-3 of those steps itself.
