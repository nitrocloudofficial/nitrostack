# 🛡️ NitroGuard — AI Safety Gateway for Autonomous Mobile Robots

> **Real-time LLM Interception + Control Barrier Functions + MuJoCo 3D Physics**  
> Built on **NitroStack MCP** | Powered by **Llama 3 (Ollama)**

[![NitroStack](https://img.shields.io/badge/Built%20with-NitroStack%20MCP-6366f1?style=for-the-badge)](https://nitrostack.dev)
[![MuJoCo](https://img.shields.io/badge/Physics-MuJoCo%203.x-orange?style=for-the-badge)](https://mujoco.org)
[![Llama 3](https://img.shields.io/badge/LLM-Llama%203%20%28Ollama%29-green?style=for-the-badge)](https://ollama.ai)

---

## 🎬 Demo Video

[![NitroGuard Demo](https://img.shields.io/badge/▶%20Watch%20Demo-YouTube-red?style=for-the-badge)](https://github.com/VK-geek/NitroGuard)

---

## 🔑 The Core Problem

Large Language Models can **plan robot missions** in natural language — but they cannot guarantee physical safety. They propose paths that cut through hazard zones, collide with industrial machines, and violate clearance boundaries.

**NitroGuard solves this** by sitting as a real-time upstream safety gateway between the LLM planner and the physical robot — mathematically guaranteeing zero-collision trajectories before any motion executes.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                   1. USER INTERACTION LAYER                     │
│  Web Ops Console (localhost:3001/trajectory-viewer)             │
│  • Map Clicks  • Typed Coordinates  • Natural Language Chat     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                2. MCP RESOURCE GROUNDING LAYER                  │
│  sim://factory-layout   — 15×15m grid bounds + locations        │
│  sim://obstacle-map     — live hazard zones + clearance radii   │
│  sim://robot-state      — live AMR telemetry + control mode     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              3. LLM INTENT & PLANNING LAYER                     │
│  Llama 3 via Ollama — reads MCP resources, extracts target      │
│  Outputs: {"targetX": float, "targetY": float, "reasoning": ""}│
│  Visualised as:  🔴 RED DASHED NOMINAL LINE                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│        4. NITROGUARD SAFETY INTERCEPTION LAYER (NitroStack)     │
│  @Tool('execute_safe_movement') + @UseGuards + @RateLimit       │
│  Tangent-Arc CBF Solver: h(x) = ‖x − Cₖ‖² − Rₖ² ≥ 0          │
│  Deflects unsafe trajectory → 🟢 GREEN SAFE LINE                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              5. MUJOCO 3D PHYSICS SIMULATION                    │
│  FastAPI bridge → freejoint kinematic control @ 60 FPS          │
│  AMR-01 physically steers along CBF-corrected waypoints         │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚡ NitroStack MCP Capabilities Used

### MCP Primitives
| Primitive | Status | Details |
|---|---|---|
| **Tools** | ✅ | `execute_safe_movement`, `emergency_stop`, `get_robot_state` |
| **Resources** | ✅ | `sim://obstacle-map`, `sim://factory-layout`, `sim://robot-state` |
| **Prompts** | ✅ | `navigate_robot_safely` — 3-step guided workflow template |
| **Widgets** | ✅ | `trajectory-viewer` — interactive 2D/3D operations console |

### NitroStack Decorators
| Decorator | Purpose |
|---|---|
| `@Tool` | Declares MCP tools with Zod input/output schemas |
| `@Resource` | Exposes live environmental data as MCP URIs |
| `@Prompt` | Structured template: Resource Read → Tool Exec → Safety Audit |
| `@Widget('trajectory-viewer')` | Binds interactive Next.js UI to tool execution |
| `@UseGuards(ApiKeyGuard)` | Auth gate — only authenticated clients can trigger motion |
| `@RateLimit({ requests: 15, window: '1m' })` | Protects physics engine from runaway LLM loops |
| `@Cache({ ttl: 10 })` | Caches obstacle map reads for 10s performance |

---

## 📐 Mathematical Safety Guarantee

Control Barrier Function enforced at every waypoint:

$$h(x) = \| x - C_k \|^2 - R_k^2 \ge 0$$

Where $C_k$ = obstacle center, $R_k$ = radius + safety margin.

The **Tangent-Arc Solver** pushes all path waypoints that violate this constraint consistently along the outward normal $\hat{n}_\perp$ of the nominal path — ensuring smooth exterior boundary arcs with no interior chord clipping.

### Verified Standoff Boundaries

| Machine | Center | Clearance $R$ | Verified Safe Standoff |
|---|---|---|---|
| Press Cell A | $(5.0, 5.0)$ | $2.5\text{ m}$ | $(2.5, 5.0)$ → distance = $2.5\text{ m}$ ✅ |
| High Voltage Cabinet | $(10.0, 3.0)$ | $2.0\text{ m}$ | $(8.0, 3.0)$ → distance = $2.0\text{ m}$ ✅ |
| Automated Gantry | $(7.0, 11.0)$ | $2.7\text{ m}$ | $(4.3, 11.0)$ → distance = $2.7\text{ m}$ ✅ |

---

## 📁 Project Structure

```
NitroGuard/
├── my-mcp-server/                  # NitroStack MCP Server
│   ├── src/
│   │   ├── app.module.ts           # Root module
│   │   ├── index.ts                # Entry point
│   │   ├── guards/
│   │   │   └── api-key.guard.ts    # @UseGuards authentication
│   │   └── modules/
│   │       └── robotics/
│   │           ├── robotics.tools.ts        # @Tool definitions
│   │           ├── robotics.resources.ts    # @Resource (sim://)
│   │           ├── robotics.prompts.ts      # @Prompt template
│   │           ├── safety-filter.service.ts # CBF math engine
│   │           ├── trajectory-planner.service.ts
│   │           └── execution-adapter.service.ts
│   └── src/widgets/               # Next.js Web Ops Dashboard
│       └── app/trajectory-viewer/ # 2D/3D map + LLM chat panel
│           └── page.tsx
│
├── mujoco-sim/                    # MuJoCo 3D Physics
│   ├── sim_bridge.py              # FastAPI bridge + 60FPS viewer
│   └── models/
│       └── amr_factory.xml        # 15×15m factory + AMR robot
│
├── NITROGUARD_ARCHITECTURE_AND_PIPELINE.md  # Full architecture doc
├── record_demo.sh                 # Screen recording script
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Python dependencies
pip install mujoco fastapi uvicorn numpy

# Node dependencies
cd my-mcp-server && npm install
cd src/widgets && npm install

# Ollama + Llama 3
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3
```

### Running the System

**Terminal 1 — MuJoCo 3D Physics Engine:**
```bash
cd mujoco-sim
python3 sim_bridge.py
```

**Terminal 2 — NitroStack MCP Server + Web Dashboard:**
```bash
cd my-mcp-server
npm run dev
```

**Browser — Operations Console:**
```
http://localhost:3001/trajectory-viewer
```

### Environment Variables

```bash
# Copy and configure
cp my-mcp-server/.env.example my-mcp-server/.env

# Required
API_KEY=nitroguard-secret-key
PORT=3001
```

---

## 🎮 How to Use

| Interaction | How | LLM Used? |
|---|---|---|
| **Click on map** | Click anywhere on 2D/3D canvas | ✅ Yes — Llama 3 plans the goal |
| **Type coordinates** | `"go to 3, 12"` in chat | ✅ Yes — Llama 3 extracts coordinates |
| **Natural language** | `"Move near High Voltage Cabinet"` | ✅ Yes — Llama 3 reads MCP resources |
| **Emergency Stop** | Click red E-STOP button | Instant halt — no LLM needed |

---

## 🔬 What the LLM Actually Does vs. What NitroGuard Does

| Layer | Role | Output |
|---|---|---|
| **Llama 3** | Reads `sim://obstacle-map`, extracts mission intent, proposes raw target $(x, y)$ | 🔴 Red dashed line |
| **NitroGuard CBF** | Intercepts raw target, computes tangent-arc deflection, enforces $h(x) \ge 0$ | 🟢 Green safe line |
| **MuJoCo** | Executes safe waypoints in real 3D physics at 60 FPS | Robot moves in 3D |

---

## 📡 API Reference

### `POST /apply_command`
```json
{
  "targetX": 10.0,
  "targetY": 10.0,
  "waypoints": [{"x": 4.5, "y": 6.1}, {"x": 7.2, "y": 8.3}],
  "linearVelocity": 1.2
}
```

### `GET /robot_state`
```json
{
  "robotId": "AMR-01",
  "x": 4.5, "y": 6.1,
  "status": "MOVING",
  "mode": "AUTO"
}
```

### `GET /factory_layout`
Returns obstacle map with hazard zone definitions.

---

## 🛡️ Safety Features

- ✅ **CBF Tangent-Arc Boundary Solver** — mathematically verified clearance at every waypoint
- ✅ **API Key Guard** — `@UseGuards(ApiKeyGuard)` on all motion tools
- ✅ **Rate Limiting** — `@RateLimit(15 req/min)` prevents runaway LLM loops
- ✅ **Emergency Stop** — `@Tool('emergency_stop')` halts MuJoCo instantly
- ✅ **E-Stop Hardware Lock** — checked at start of every `execute_safe_movement` call
- ✅ **Factory Bounds Clamping** — coordinates clamped to 0–15m grid

---

## 🏆 Hackathon: NitroStack Track

**Problem Statement**: Build an AI-powered industrial safety system using NitroStack MCP.

**Solution**: NitroGuard intercepts LLM tool calls upstream, applies real-time CBF collision avoidance mathematics, and executes physically-verified safe trajectories in MuJoCo 3D simulation.

**Key Innovation**: The first system to combine NitroStack MCP's `@Tool` + `@Resource` + `@Widget` full decorator stack with Control Barrier Function safety theory and a live 3D physics engine.

---

## 📄 License

MIT © 2025 NitroGuard Team
