# ⚖️ GAVEL: Frontend Intelligence MCP Server
## Master Idea Gist & Comprehensive Concept Specification

> **Team Name:** Stark Spiders  
> **Project Name:** Frontend Intelligence MCP (Codename / Nickname: **Gavel**)  
> **Tech Stack:** NitroStack, TypeScript, Groq LLM (`llama-3.3-70b-versatile`), Zod, Chrome Lighthouse, Tailwind Token Extractor  
> **Primary Integration:** Model Context Protocol (MCP) Server for AI Chat Assistants (NitroStudio, Antigravity IDE, Claude Desktop, VSCode Cursor)  

---

## 📌 1. Executive Summary & Core Motto

### Core Motto:
> **"The rules decide. The LLM only phrases."**

**Gavel** is an **AI Frontend Architect MCP Server** built with **NitroStack**. When pointed at a real web application codebase, Gavel inspects actual project files (`package.json`, lockfiles, `tailwind.config.js`, component trees), gathers user intent through intelligent caching, evaluates 6 modern UI and animation libraries against deterministic engineering rules, calculates transparent confidence scores with visible math, generates actionable coding specs with extracted design tokens, and validates its recommendation using automated before-and-after Lighthouse performance benchmarks—rendering everything live as interactive visual widgets inside the AI chat interface.

---

## 💥 2. The Problem Statement: Why "Ask ChatGPT" Fails for Frontend Architecture

When developers ask standard Large Language Models (Claude, ChatGPT, Gemini, DeepSeek) for architectural advice—such as *"Which animation library should I use for my web app?"*—the response suffers from four fundamental engineering flaws:

### 1. The Illusion of Intelligence ("Vibes" Over Code)
Standard LLMs recommend libraries based on training text frequency and internet popularity rather than real code inspection. An LLM might recommend **Framer Motion** to a non-React project or **Three.js** to a simple landing page because those libraries are frequently discussed online, ignoring actual technical suitability.

### 2. Zero Local Project Context
LLMs operating without MCP tools cannot see local workspace files. They have no visibility into:
- Whether **GSAP** is already installed in `package.json`, creating redundant bundle bloat if **Framer Motion** is added.
- The project's existing color palette, fonts, or Tailwind design tokens.
- Framework constraints (React 19 Server Components vs Next.js Pages Router vs Vite).

### 3. Lack of Reproducibility & Hallucinations
Because LLMs generate output stochastically, asking the exact same question twice can result in completely contradictory recommendations. Furthermore, LLMs frequently hallucinate API method signatures or recommend unmaintained, deprecated packages.

### 4. Zero Empirical Performance Validation
An LLM will confidently tell a developer that a library is "lightweight and fast," but it cannot measure bundle size impact, test tree-shaking, or execute runtime Lighthouse audits to prove whether performance improved or degraded.

---

## 🛡️ 3. The Core Solution: Gavel Architecture

Gavel solves these flaws by introducing a **hybrid architecture** that strictly separates **deterministic decision logic** from **natural language synthesis**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                GAVEL HYBRID PIPELINE                                   │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│    REASONING LAYER       │      EVALUATION LAYER       │       PRESENTATION LAYER      │
│  (Deterministic Rules)   │      (Visible Math)         │   (Interactive Nitro Widgets) │
│                          │                             │                               │
│ • Inspects real files    │ • Confidence Formula Math   │ • Recommendation Card Widget  │
│ • Deterministic Rules    │ • Bundle Impact Estimation  │ • Design Spec Card Widget     │
│ • Package conflict checks│ • Lighthouse Audits         │ • Benchmark Chart Widget      │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │           GROQ LLM (LLaMA 3.3)        │
                       │   Phrases ONE rationale sentence ONLY │
                       │    (Never touches the decision)      │
                       └───────────────────────────────────────┘
```

### Why This Beats Standard LLM Chat:
1. **Explainable:** Every recommendation displays the exact rules triggered and mathematical score breakdown.
2. **Reproducible:** Given the same project files and intent answers, Gavel returns the identical winning library every single time.
3. **Non-Hallucinatory:** The candidate pool is restricted to vetted engineering rule sets.
4. **Empirically Proven:** Includes real before-and-after Chrome Lighthouse performance scores and gzipped bundle size metrics.

---

## ⚙️ 4. The Complete 9-Step Execution Pipeline

When a developer interacts with Gavel in an AI chat session, Gavel executes a strict 9-step pipeline:

```
Step 0: User provides repo path + answers 3 intent questions
           (cached in .gavel-context for one-click re-confirmation)
              ↓
Step 1: analyzeProject() — reads package.json, tailwind config, folder structure
              ↓  produces: ProjectProfile
Step 2: Deep Evidence Inspection — inspectDependencies() & inspectDesignLanguage()
              ↓  extracts: installed packages & design tokens (colors/fonts)
Step 3: Rule Engine — evaluates ProjectProfile against 6 candidate library rules
              ↓  produces: matched & rejected candidates
Step 4: Scoring Engine — computes 0–100 confidence score per candidate
              ↓  produces: ScoredRecommendation + RejectedRecommendation
Step 5: Groq LLM — synthesizes ONE sentence explaining the pre-determined winner
              ↓  fills in: reasoning field only
Step 6: generateDesignSpec() — synthesizes winner + extracted design tokens
              ↓  produces: DesignSpec (hex codes, easing, millisecond durations)
Step 7: Live Widget Rendering — Recommendation Card & Design Spec Card render live
Step 8: Lighthouse Benchmark — runLighthouse() runs before/after audit
              ↓  produces: BenchmarkResult
Step 9: Benchmark Proof Widget — Benchmark Chart Widget renders visual performance delta
```

---

## 📊 5. The Confidence Scoring Formula

To eliminate "black box" decisions, Gavel evaluates recommendations using a transparent mathematical formula:

$$\text{Confidence} = \text{clamp}\left(0, 100, (0.6 \times \text{matchStrength} + 0.4 \times \text{compatibility} - \text{conflictPenalty}) \times 100\right)$$

### Formula Breakdown:

| Variable | Weight | Description |
|---|---|---|
| `matchStrength` | **60%** | The ratio of matching rule conditions satisfied by the project profile (0.0 to 1.0). |
| `compatibility` | **40%** | Assessment of framework and package compatibility with existing dependencies (0.0 to 1.0). |
| `conflictPenalty` | **Subtracted** | Deductions applied when conflicting or duplicate libraries are detected (0.0 to 0.5). |

### Worked Calculation Examples:

#### Case A: Ideal Project Match (Framer Motion in Next.js)
- 3 out of 3 rule conditions match $\rightarrow \text{matchStrength} = 1.0$
- Full React 19 / Next.js App Router compatibility $\rightarrow \text{compatibility} = 1.0$
- No conflicting animation libraries installed $\rightarrow \text{conflictPenalty} = 0.0$
$$\text{Confidence} = (0.6 \times 1.0 + 0.4 \times 1.0 - 0.0) \times 100 = \mathbf{100\%}$$

#### Case B: Sub-optimal / Messy Project
- 2 out of 3 rule conditions match $\rightarrow \text{matchStrength} = 0.67$
- Partial framework compatibility $\rightarrow \text{compatibility} = 0.80$
- Minor package overlap detected $\rightarrow \text{conflictPenalty} = 0.10$
$$\text{Confidence} = (0.6 \times 0.67 + 0.4 \times 0.80 - 0.10) \times 100 = (0.402 + 0.32 - 0.10) \times 100 = \mathbf{62\%}$$

---

## 📚 6. The 6 Candidate UI & Animation Libraries

Gavel evaluates 6 curated, production-grade frontend libraries across distinct design and functional categories:

| Candidate Library | Primary Category | Primary Use Case & Strengths | Typical Rejection Reason |
|---|---|---|---|
| **Framer Motion** | React Component Motion | Layout transitions, gesture animations, page transitions, React component state morphing. | Non-React projects; simple static sites without component state transitions. |
| **GSAP** | Advanced Timeline Motion | Complex multi-stage sequenced timelines, scroll triggers, SVG path morphing. | Overkill for basic UI transitions; adds unnecessary bundle size for simple toggles. |
| **Lenis** | Smooth Scroll Engine | Inertial smooth scrolling, parallax normalization across browsers. | Static pages without long scroll runways; sites prioritizing native scroll performance. |
| **Magic UI** | Animated UI Components | Pre-built glowing borders, particles, glassmorphism hero cards. | Custom minimalist design systems; projects requiring low bundle overhead. |
| **React Bits** | Utility UI Patterns | Micro-interactions, animated text headers, hover card effects. | Projects with full existing design systems; non-React environments. |
| **Three.js** | 3D WebGL Graphics | Complex 3D particle fields, interactive canvas models, WebGL shaders. | High GPU consumption; overkill for standard 2D layout and text components. |

---

## 🎯 7. Intent Elicitation & Local Context Caching (`.gavel-context`)

Technical code analysis alone is insufficient without understanding **human business intent**. A technical portfolio for a recruiter requires different trade-offs than an e-commerce checkout page.

### The 3 Elicitation Questions:
1. **Target Audience:** Who is this website for? (e.g., Technical recruiters, enterprise clients, consumers, internal team).
2. **Primary Priority:** What matters most? (e.g., Visual polish & wow-factor vs. maximum performance & fast load time).
3. **Interaction Complexity:** What level of motion is needed? (e.g., Subtle micro-interactions vs. heavy interactive timelines).

### Smart Caching Mechanics:
- **First Run:** Gavel presents the 3 questions and writes the answers alongside a Unix timestamp to a local `.gavel-context` file in the project root.
- **Subsequent Runs:** Instead of annoying the user by re-prompting every time, Gavel checks `.gavel-context` and presents a one-line confirmation:  
  *"Last set 2 hours ago: Recruiter portfolio, Polish priority, High interaction — still accurate? [Yes / Update]"*

---

## 🎨 8. Native NitroStack Interactive Widgets

Standard MCP tools only return raw JSON strings or long plain-text blocks into the chat window. Gavel leverages **NitroStack Widgets** to render rich, interactive UI cards directly inside NitroStudio and Antigravity IDE:

- **Recommendation Card Widget (`widgets/recommendation-card`):** Displays winner, confidence bar, breakdown math, and collapsible list of rejected candidates with reasons.
- **Design Spec Card Widget (`widgets/design-spec-card`):** Visualizes extracted design tokens (hex codes, font sizes) alongside recommended easing curves and animation parameters.
- **Benchmark Proof Chart Widget (`widgets/benchmark-chart`):** Shows before/after Core Web Vitals comparisons, bundle size deltas, and speed index improvements.

---

## 🧪 9. Empirical Proof: Lighthouse & Bundle Audit Pipeline

Gavel does not stop at recommending a library; it proves that the recommendation works without destroying performance.

### 1. Bundle Impact Estimation (`estimateBundleImpact`)
Analyzes minified and gzipped bundle deltas, assessing tree-shaking capabilities and side-effect imports before code is written.

### 2. Automated Lighthouse Audits (`runLighthouse`)
Runs Chrome Headless Lighthouse audits against the target application, measuring Core Web Vitals:
- **Largest Contentful Paint (LCP):** Measures main content render speed.
- **Total Blocking Time (TBT):** Measures main thread responsiveness.
- **Cumulative Layout Shift (CLS):** Measures visual stability during layout animations.

---

## 🛠️ 10. MCP Tool Registry

Gavel exposes 10 structured MCP tools split across four functional owners:

| Tool Name | Owner | Inputs | Outputs | Purpose |
|---|---|---|---|---|
| `elicitIntent` | Role B | `repoPath`, `answers?` | `IntentProfile` | Gathers or confirms human business intent with `.gavel-context` caching. |
| `analyzeProject` | Role B | `repoPath` | `ProjectProfile` | Parses `package.json`, framework, lockfile, and folder structure. |
| `inspectDependencies` | Role B | `repoPath` | `DependencyReport` | Audits installed packages to prevent duplicate library recommendations. |
| `inspectDesignLanguage` | Role B | `repoPath` | `ThemeTokens` | Extracts exact hex colors, fonts, and spacing from Tailwind/CSS. |
| `recommendLibraries` | Role C | `ProjectProfile`, `IntentProfile` | `ScoredRecommendation` | Evaluates rule engine, confidence formula, and Groq text synthesis. |
| `compareLibraries` | Role C | `libA`, `libB`, `ProjectProfile` | `ComparisonReport` | Direct 1-v-1 architectural trade-off comparison between two candidate libraries. |
| `estimateBundleImpact` | Role C | `libraryName` | `BundleImpact` | Computes minified/gzipped KB size and tree-shaking metrics. |
| `generateDesignSpec` | Role C | `ScoredRecommendation`, `ThemeTokens` | `DesignSpec` | Fuses winning library with design tokens into usable coding specs. |
| `runLighthouse` | Role D | `url` | `BenchmarkResult` | Runs automated before/after Chrome Lighthouse performance audits. |
| `compareMetrics` | Role D | `before`, `after` | `MetricsComparison` | Computes Core Web Vitals performance delta between audit runs. |

---

## 🚀 11. How to Run & Connect

### Prerequisites
- **Node.js:** v18+ or v20+
- **NitroStack CLI:** Installed globally or via `npx @nitrostack/cli`
- **Groq API Key:** (Optional) Set `GROQ_API_KEY` in `.env` for AI rationale synthesis (falls back to deterministic explanations if omitted).

### Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Build & Start Production:**
   ```bash
   npm run build
   npm start
   ```

5. **Run Test Suites:**
   ```bash
   npm test
   ```

### Connecting to MCP Clients

Add Gavel to your MCP client config (e.g. `mcp_config.json`, Claude Desktop, Cursor, or NitroStudio):

```json
{
  "mcpServers": {
    "gavel": {
      "command": "node",
      "args": ["/path/to/nitrostack/sample-apps/gavel/dist/index.js"],
      "env": {
        "GROQ_API_KEY": "your_groq_api_key_here"
      }
    }
  }
}
```

Or connect directly to the hosted deployment:
```json
{
  "mcpServers": {
    "gavel": {
      "url": "https://gavel-6a6da92f-stark-spiders-srmist.app.nitrocloud.ai"
    }
  }
}
```

---

## 🏆 12. Judge Defensibility Cheat Sheet

1. **"Why not just ask ChatGPT?"**  
   *"ChatGPT guesses based on web text frequency without reading local project files. It doesn't know what packages are installed, hallucinates APIs, and changes its answer randomly. Gavel inspects real files, evaluates deterministic rules, and proves its recommendation with Lighthouse benchmarks."*

2. **"How do you prevent LLM hallucinations?"**  
   *"The LLM never makes the architectural decision. Our deterministic rule engine and visible scoring formula select the winner. The LLM (Groq LLaMA 3.3) is restricted to writing one natural language rationale sentence describing the pre-determined result."*

3. **"What is the value of NitroStack Widgets?"**  
   *"Standard MCP tools flood the AI chat with raw JSON text. NitroStack widgets render live, interactive visual UI cards—giving developers immediate visual clarity on recommendations, design specs, and performance benchmarks."*

---

## 📄 License
MIT © 2026 Stark Spiders
