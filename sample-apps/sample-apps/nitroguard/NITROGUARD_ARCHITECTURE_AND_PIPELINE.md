# 🛡️ NitroGuard AI Safety Gateway: End-to-End Architecture & Pipeline

## Executive Summary

**NitroGuard** is a real-time AI Safety Gateway and Upstream Interception Architecture designed for Autonomous Mobile Robots (AMRs) operating in dynamic industrial factory environments.

While Large Language Models (LLMs) excel at natural language mission planning, they lack deterministic spatial physics awareness and cannot guarantee 100% collision safety. NitroGuard sits between the LLM planner and physical robot execution, intercepting LLM tool calls in real time and applying mathematical **Control Barrier Functions (CBFs)** to guarantee zero-collision boundary enforcement before executing motion in **MuJoCo 3D Physics**.

---

## ⚡ NitroStack & MCP Framework Capabilities Matrix

NitroGuard leverages the full power of the **Model Context Protocol (MCP)** and **NitroStack** framework primitives:

### 1. MCP Primitives Matrix
| MCP Primitive | Status | Implementation Details |
|---|---|---|
| **Tools** | ✅ Active | `@Tool('execute_safe_movement')`, `@Tool('emergency_stop')`, `@Tool('get_robot_state')` |
| **Resources** | ✅ Active | `sim://obstacle-map` (hazard zones), `sim://factory-layout` (grid bounds), `sim://robot-state` (live telemetry) |
| **Prompts** | ✅ Active | `@Prompt('navigate_robot_safely')` - Structured 3-step guided workflow template (Resource Read -> Tool Exec -> Safety Audit) |
| **Widgets** | ✅ Active | `@Widget('trajectory-viewer')` - Interactive 2D/3D visual operations console |

### 2. NitroStack Decorator Stack
| NitroStack Decorator | Target Class / Method | Operational Role |
|---|---|---|
| **`@Tool`** | `RoboticsTools` | Declares executable MCP tools with Zod input/output schemas |
| **`@Resource`** | `RoboticsResources` | Exposes live environmental context and telemetry as readable MCP URIs |
| **`@Prompt`** | `RoboticsPrompts` | Formats spatial planning templates for LLM consumption |
| **`@Widget`** | `RoboticsTools.executeSafeMovement` | Associates Next.js interactive UI console with tool execution |
| **`@UseGuards(ApiKeyGuard)`** | `RoboticsTools` | Authentication & authorization security gate for motion execution |
| **`@RateLimit({ requests: 15, window: '1m' })`** | `RoboticsTools.executeSafeMovement` | Prevents runaway/looping LLMs from flooding the engine |
| **`@Cache({ ttl: 10 })`** | `RoboticsResources.getObstacleMap` | Caches hazard zone maps for 10 seconds to optimize performance |

---

## 📐 Mathematically Grounded Demo Standoff Coordinates

When Llama 3 reads `sim://obstacle-map` (center $C$, machine radius $r$, safety margin $m$, total clearance radius $R = r + m$), it computes a safe standoff target coordinate $P_{\text{standoff}}$ directly on the clearance perimeter ($P_{\text{standoff}} = C - R \cdot \hat{u}$):

| Machine / Hazard Zone | Center $(X, Y)$ | Radius $r$ | Clearance $R$ | Safe Standoff Target $P_{\text{standoff}}$ | Exact Distance to Center |
|---|---|---|---|---|---|
| **Press Cell A** | $(5.0, 5.0)$ | $2.0\text{ m}$ | $2.5\text{ m}$ | **$(2.5, 5.0)$** | $\|(2.5, 5.0) - (5.0, 5.0)\| = 2.5\text{ m}$ (Safe Standoff) |
| **High Voltage Cabinet** | $(10.0, 3.0)$ | $1.5\text{ m}$ | $2.0\text{ m}$ | **$(8.0, 3.0)$** | $\|(8.0, 3.0) - (10.0, 3.0)\| = 2.0\text{ m}$ (Safe Standoff) |
| **Automated Gantry Conveyor** | $(7.0, 11.0)$ | $2.2\text{ m}$ | $2.7\text{ m}$ | **$(4.3, 11.0)$** | $\|(4.3, 11.0) - (7.0, 11.0)\| = 2.7\text{ m}$ (Safe Standoff) |

---

## 🏗️ End-to-End System Pipeline Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             1. USER INTERACTION LAYER                            │
│  - Web Console Dashboard (http://localhost:3001/trajectory-viewer)               │
│  - 3 Interaction Pathways: Map Clicks, Typed Coords, Natural Language Chat        │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         2. MCP RESOURCE GROUNDING LAYER                          │
│  - Fetches live MCP Resources before planning:                                   │
│    * sim://factory-layout  (15x15m bounds & standoff locations)                  │
│    * sim://obstacle-map    (circular hazard perimeters & clearances)             │
│    * sim://robot-state     (live AMR telemetry & control mode)                   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         3. LLM INTENT & PLANNING LAYER                           │
│  - Local Llama 3 Model (via Ollama API on http://localhost:11434)                │
│  - Reasons about mission using grounded MCP Resource data                        │
│  - Computes safe standoff coordinates outside clearance radius                   │
│  - Produces Nominal Path (🔴 RED DASHED LINE)                                    │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   4. NITROGUARD UPSTREAM SAFETY INTERCEPTION LAYER                │
│  - NitroStack MCP Server (TypeScript / Zod Schema Validation)                    │
│  - Security & Rate Limits: @UseGuards(ApiKeyGuard) & @RateLimit(15 req/min)      │
│  - Executes Control Barrier Function (CBF) Tangent Arc Boundary Solver           │
│  - Computes Safe Trajectory (🟢 GREEN SOLID LINE)                                │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    5. MUJOCO 3D PHYSICS SIMULATION LAYER                         │
│  - FastAPI Physics Bridge (http://localhost:8000)                                │
│  - MuJoCo 3.x Engine with 15x15m Factory Model & 3D Machine Assets               │
│  - Freejoint Kinematic Motion Controller (60 FPS passive viewer sync)            │
│  - AMR-01 physically steers along the deflected safe green waypoints             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Layer-by-Layer Technical Specification

### Layer 1: User Interaction Layer (`my-mcp-server/src/widgets`)
* **Technology**: Next.js 14, React 18, HTML5 Canvas / SVG, Vanilla CSS.
* **Component**: [`trajectory-viewer/page.tsx`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/my-mcp-server/src/widgets/app/trajectory-viewer/page.tsx)
* **Function**: Dual 2D Top-Down / 3D Isometric visual control dashboard with live obstacle safety zones, nominal path overlays, corrected path vectors, and mission chat.

### Layer 2: MCP Resource Grounding & LLM Intent Layer (`Ollama / Llama 3`)
* **Technology**: Llama 3 (8B Q4_0), Ollama Local Server (`http://localhost:11434`).
* **Function**: Reads live MCP resources (`sim://factory-layout`, `sim://obstacle-map`, `sim://robot-state`), calculates standoff boundary points ($R = r + m$), and extracts target coordinates and reasoning.
* **Output**: Target JSON `{"targetX": float, "targetY": float, "reasoning": "..."}`.

### Layer 3: NitroGuard Upstream Safety Gateway (`my-mcp-server/src/modules/robotics`)
* **Technology**: TypeScript, `@nitrostack/core`, Zod Schema Validation.
* **Components**:
  * [`safety-filter.service.ts`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/my-mcp-server/src/modules/robotics/safety-filter.service.ts): Control Barrier Function equations & hazard zone definitions.
  * [`trajectory-planner.service.ts`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/my-mcp-server/src/modules/robotics/trajectory-planner.service.ts): Waypoint generator.
  * [`robotics.tools.ts`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/my-mcp-server/src/modules/robotics/robotics.tools.ts): `@Tool('execute_safe_movement')`, `@Tool('emergency_stop')`, `@UseGuards(ApiKeyGuard)`, `@RateLimit`.
  * [`robotics.resources.ts`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/my-mcp-server/src/modules/robotics/robotics.resources.ts): `@Resource('sim://obstacle-map')`, `@Resource('sim://factory-layout')`, `@Resource('sim://robot-state')`, `@Cache`.
  * [`robotics.prompts.ts`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/my-mcp-server/src/modules/robotics/robotics.prompts.ts): `@Prompt('navigate_robot_safely')` template.

### Layer 4: Tangent Boundary Arc CBF Solver
* **Barrier Function**: For obstacle center $C_k = (x_k, y_k)$ with radius $R_k = r_k + \text{margin}$:
  $$h(x) = \| x - C_k \|^2 - R_k^2 \ge 0$$
* **Tangent Arc Solver**: Projects obstacle centers onto the nominal path line vector. Pushes points passing near hazard zones consistently along the outward normal vector $\hat{n}_\perp$, generating smooth exterior boundary arcs without interior chord clipping.

### Layer 5: MuJoCo 3D Physics Simulator (`mujoco-sim/`)
* **Technology**: MuJoCo 3.x, Python 3.10, FastAPI, Uvicorn, GLFW.
* **Components**:
  * [`models/amr_factory.xml`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/mujoco-sim/models/amr_factory.xml): 15x15m factory floor, boundary walls, Press Cell A, High Voltage Cabinet, and Automated Gantry Conveyor with freejoint AMR body.
  * [`sim_bridge.py`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/mujoco-sim/sim_bridge.py): Multi-threaded bridge running FastAPI server alongside GLFW main-thread passive viewer loop at 60 FPS.

---

## 📊 Visual Representation of Trajectories

| Visual Overlay | Color | Description | Role |
|---|---|---|---|
| **Nominal Path** | 🔴 Red Dashed Line | Unvalidated goal generated by LLM / User prompt | Represents AI Intent |
| **Safe Path** | 🟢 Green Solid Line | CBF-deflected vector generated by NitroGuard | Represents Safe Physical Execution |
| **Hazard Zones** | 🟠 Orange Circles | 0.5m / 1.0m safety clearance perimeters around machines | Boundary Enforcement |

---

## 📁 Key File Index

| Directory | File | Purpose |
|---|---|---|
| `mujoco-sim/` | [`sim_bridge.py`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/mujoco-sim/sim_bridge.py) | FastAPI physics bridge & MuJoCo 3D visualizer |
| `mujoco-sim/models/` | [`amr_factory.xml`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/mujoco-sim/models/amr_factory.xml) | MJCF 3D factory floor & machine models |
| `my-mcp-server/src/modules/robotics/` | [`robotics.tools.ts`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/my-mcp-server/src/modules/robotics/robotics.tools.ts) | `@Tool` methods (`execute_safe_movement`, `emergency_stop`) with `@UseGuards` & `@RateLimit` |
| `my-mcp-server/src/modules/robotics/` | [`robotics.resources.ts`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/my-mcp-server/src/modules/robotics/robotics.resources.ts) | `@Resource` methods (`sim://obstacle-map`, `sim://factory-layout`, `sim://robot-state`) with `@Cache` |
| `my-mcp-server/src/modules/robotics/` | [`robotics.prompts.ts`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/my-mcp-server/src/modules/robotics/robotics.prompts.ts) | `@Prompt` template (`navigate_robot_safely`) |
| `my-mcp-server/src/modules/robotics/` | [`safety-filter.service.ts`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/my-mcp-server/src/modules/robotics/safety-filter.service.ts) | Control Barrier Function safety filter |
| `my-mcp-server/src/widgets/app/trajectory-viewer/` | [`page.tsx`](file:///home/vishal/NitroGuard_3D_Ubuntu_Bundle/my-mcp-server/src/widgets/app/trajectory-viewer/page.tsx) | Next.js Web Operations Dashboard & LLM Chat |

---

## 🚀 How to Run the End-to-End System

### 1. Terminal 1: MuJoCo 3D Physics Visualizer
```bash
cd /home/vishal/NitroGuard_3D_Ubuntu_Bundle/mujoco-sim
python3 sim_bridge.py
```

### 2. Terminal 2: NitroStack MCP Server & Web Operations Console
```bash
cd /home/vishal/NitroGuard_3D_Ubuntu_Bundle/my-mcp-server
npm run dev
```

### 3. Browser Operations Console
Open **[http://localhost:3001/trajectory-viewer](http://localhost:3001/trajectory-viewer)** in Chrome or Firefox.
