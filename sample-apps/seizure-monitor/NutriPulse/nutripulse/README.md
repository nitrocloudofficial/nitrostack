# NutriPulse MCP

**Biometric-Aware Health and Nutrition Intelligence Server**

NutriPulse is a production-grade Model Context Protocol (MCP) server that transforms a host LLM into a clinically-grounded nutritional advisor. It fuses real-time wearable telemetry, lab-report biomarkers, allergen databases, and a curated food catalog into a single deterministic reasoning engine -- delivering meal recommendations that are simultaneously safe, nutritious, budget-conscious, and satisfying.

Built with the NitroStack TypeScript SDK for the Amrita University MCP Hackathon 2026.

---

## Table of Contents

- [Overview](#overview)
- [Key Highlights](#key-highlights)
- [Problem Statement](#problem-statement)
- [Our Solution](#our-solution)
- [Multi-Agent Workflow](#multi-agent-workflow)
- [The Agent](#the-agent)
- [Detailed MCP Architecture](#detailed-mcp-architecture)
- [System Architecture](#system-architecture)
- [Dashboard](#dashboard)
- [Core Features](#core-features)
- [MCP Capabilities](#mcp-capabilities)
  - [MCP Tools](#mcp-tools)
  - [MCP Resources](#mcp-resources)
  - [MCP Prompts](#mcp-prompts)
- [Data Layer](#data-layer)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Testing](#testing)

---

## Overview

NutriPulse MCP is a biometric-aware, clinically-grounded nutrition intelligence server that operates as a connector between wearable health data and AI-powered meal recommendations. Unlike generic diet apps that apply one-size-fits-all rules, NutriPulse dynamically computes a **Nutritional Envelope** for each user at each meal slot, incorporating:

- **Medical conditions** (Diabetes T2, Hypertension, CKD, Dyslipidemia, Coeliac)
- **Lab-report biomarkers** (HbA1c, Haemoglobin, Vitamin D, eGFR, and 12 more analytes)
- **Real-time wearable telemetry** (heart rate, sleep quality, stress index, steps, hydration)
- **Allergen cross-referencing** (9 major allergen categories with ingredient-level tracing)
- **Drug-nutrient interactions** (Warfarin-Vitamin K, MAOI-Tyramine, Statin-Grapefruit, Levothyroxine-Calcium)
- **Budget constraints** (daily and weekly pacing with value-efficiency scoring)
- **Taste and craving satisfaction** (cuisine preference, spice tolerance, texture matching, flavour-profile similarity)

Every computation is deterministic and server-side. The host LLM narrates results; it never performs the clinical reasoning. Every tool returns structured JSON with a `calculation_trace` field showing inputs, rules applied, and intermediate values.

---

## Key Highlights

- **Deterministic Clinical Engine**: All nutritional logic runs server-side with full calculation traces. The LLM presents findings but never invents clinical data.
- **Safety-First Architecture**: Allergen BLOCKs and drug-interaction BLOCKs are absolute and can never be overridden by scoring, optimization, or any resolver logic. A dedicated Safety Interceptor enforces this at the framework level.
- **Four-Objective Pareto Resolver**: Recommendations are resolved across clinical fit, contextual preference, budget, and craving satisfaction using a true Pareto front with lexicographic tiebreaking.
- **Real-Time Biometric Adaptation**: Wearable data (sleep, stress, steps, hydration, HR recovery) dynamically adjusts macro targets, hydration goals, and sugar ceilings in real time.
- **Full Calculation Transparency**: Every tool returns a `calculation_trace` with inputs, intermediate values, rules fired, and source citations. No unexplained numbers anywhere in the system.
- **Lab-Driven Deficiency Uplift**: Low lab values automatically boost dietary targets for the deficient nutrient with severity-weighted uplift multipliers.
- **200+ Dish Catalog**: USDA FoodData Central-sourced nutritional profiles with glycemic index estimates, allergen declarations, and ingredient-level breakdowns.
- **Conflict Narration**: The resolver explicitly reports what was sacrificed, which alternative lost, and why -- never hiding a safety block or a budget tradeoff.
- **Zod-Validated Everything**: Every tool input, domain type, and data record is validated with Zod schemas. No `any` in business logic.
- **Production Deployment**: Built on NitroStack with dual transport (STDIO + HTTP SSE), deployable to NitroCloud, and connectable as a ChatGPT plugin.

---

## Problem Statement

Modern nutrition is stuck between two extremes:

1. **Generic calorie counters** that ignore medical conditions, lab values, medications, and real-time biometric state. A diabetic patient and an athlete get the same "eat 2000 kcal" advice.

2. **Clinical dietitian consultations** that are accurate but expensive, infrequent, and cannot adapt to real-time signals. A dietitian cannot know that a patient slept poorly last night and is currently stressed and dehydrated.

The gap between these two extremes leaves millions of people with chronic conditions making daily food decisions with inadequate information. A hypertensive patient unknowingly orders a high-sodium meal. A diabetic with iron deficiency picks food that is low-GI but also low-iron. A patient on warfarin eats a vitamin-K-rich dish that interferes with their medication.

The consequences are real: medication efficacy drops, chronic conditions worsen, and preventable health complications arise -- all from meals that a smarter system could have flagged or redirected.

---

## Our Solution

NutriPulse solves this by placing a **deterministic clinical rules engine** between the user and their food choices, wrapped in an MCP server that any LLM can invoke. The system:

1. **Loads the full patient context** -- medical profile, lab reports, active medications, allergies, dietary preferences, budget, and today's wearable telemetry.

2. **Computes a per-meal Nutritional Envelope** -- combining Mifflin-St Jeor BMR, telemetry-adjusted TDEE, today's intake history, clinical hard constraints, and deficiency-driven soft targets into a precise nutritional window for the next meal.

3. **Searches and safety-screens the food catalog** -- every candidate dish is evaluated against allergen declarations, ingredient-level allergen cross-referencing, drug-nutrient interaction rules, and condition-specific nutrient caps. Dishes that violate critical rules receive an absolute BLOCK that cannot be overridden.

4. **Resolves multi-objective conflicts** -- safe candidates are scored across four dimensions (clinical, contextual, budget, craving) and resolved using Pareto-optimal front selection with lexicographic tiebreaking.

5. **Narrates the tradeoffs transparently** -- the conflict log shows the user exactly what was sacrificed, which dish lost and why, and what safety blocks were applied. Decisions are explainable, not opaque.

---

## Multi-Agent Workflow

NutriPulse operates as an MCP server that exposes tools, resources, and prompts to a host LLM. The multi-agent workflow proceeds through six coordinated stages:

```
User Query
    |
    v
+-----------------------------------+
| HOST LLM (ChatGPT / Claude / etc) |
| Selects appropriate MCP prompt     |
| or invokes tools directly          |
+-----------------------------------+
    |
    v
+------------------------------------------+
| STAGE 1: CONTEXT ASSEMBLY               |
| Read Resources:                          |
|   profile://{userId}                     |
|   labs://{userId}/latest                 |
|   telemetry://{userId}/today             |
|   intake://{userId}/today                |
|   budget://{userId}                      |
+------------------------------------------+
    |
    v
+------------------------------------------+
| STAGE 2: ENVELOPE COMPUTATION            |
| Tool: compute_nutritional_envelope       |
| - Mifflin-St Jeor BMR                   |
| - Telemetry-adjusted TDEE               |
| - Intake subtraction                     |
| - Slot allocation (meal split)           |
| - Hard constraints from clinical rules   |
| - Soft targets from diet plan + labs      |
| - Telemetry-driven adjustments           |
+------------------------------------------+
    |
    v
+------------------------------------------+
| STAGE 3: CANDIDATE ASSEMBLY + SAFETY    |
| Tool: resolve_recommendation             |
| - Assemble 60 candidates from catalog    |
| - Evaluate each against safety rules     |
| - BLOCK allergens, drug interactions      |
| - WARN on soft-target violations          |
| - Drop all BLOCKED dishes                |
+------------------------------------------+
    |
    v
+------------------------------------------+
| STAGE 4: MULTI-OBJECTIVE SCORING        |
| Four independent scorers:                |
|   - ClinicalScorer  (macro + deficiency) |
|   - ContextualScorer (taste + variety)   |
|   - BudgetScorer  (afford + value)       |
|   - CravingScorer (similarity + anchor)  |
+------------------------------------------+
    |
    v
+------------------------------------------+
| STAGE 5: PARETO RESOLUTION              |
| - Compute Pareto-optimal front           |
| - Lexicographic tiebreak:               |
|   1. Fewest/least severe WARNs          |
|   2. Within daily budget cap             |
|   3. Highest craving satisfaction        |
|   4. Highest contextual score            |
|   5. Stable dish ID tiebreak             |
+------------------------------------------+
    |
    v
+------------------------------------------+
| STAGE 6: CONFLICT NARRATION             |
| - Winner dish + carried warnings         |
| - Runners-up with disqualification reason|
| - Clinically optimal alternative         |
| - Cheapest safe alternative              |
| - Highest craving alternative            |
| - Dropped-for-safety list               |
| - Full calculation_trace                 |
+------------------------------------------+
    |
    v
Host LLM narrates the result to the user
```

---

## The Agent

The NutriPulse agent operates through MCP prompts that orchestrate the tool pipeline into coherent specialist narratives. When a user asks "What should I eat for lunch?", the agent:

1. **Reads the user's full context** via MCP resources (profile, labs, telemetry, intake, budget).
2. **Invokes `resolve_recommendation`** which internally runs the complete pipeline: envelope computation, catalog search, safety screening, four-objective scoring, and Pareto resolution.
3. **Narrates the result as a three-specialist council**:
   - **Clinical Advisor**: States hard constraints and why they matter, citing the exact rules and real values from the envelope and safety verdicts.
   - **Culinary Advisor**: Speaks to taste fit, cuisine, texture, and craving satisfaction based on contextual and craving scores.
   - **Financial Advisor**: States the user's budget position with exact rupee figures and weekly pacing analysis.
4. **Presents the resolution**: Announces the winning dish, reads out the conflict log naming exactly what was sacrificed in real units, which alternative lost and why, and any dishes removed for safety. BLOCK verdicts are never hidden or argued with.

![NutriPulse Agent Dashboard](docs/dashboard_agent.png)

---

## Detailed MCP Architecture

NutriPulse is built as a modular MCP server following a layered architecture with strict separation of concerns. Each layer communicates through well-defined interfaces, and all clinical logic is deterministic and fully traceable.

### Application Module Structure

The server is organized into seven domain modules plus a core infrastructure layer:

```
AppModule (Root)
  |
  +-- CoreModule
  |     +-- ResourceNotifierService    // MCP resource update notifications
  |
  +-- ProfileModule
  |     +-- Tools:     ping
  |     +-- Resources: profile://{userId}
  |
  +-- ClinicalModule
  |     +-- Tools:     compute_nutritional_envelope, check_meal_safety
  |     +-- Resources: labs://{userId}/latest, labs://{userId}/history
  |
  +-- CatalogModule
  |     +-- Tools:     search_catalog
  |     +-- Resources: catalog://restaurants
  |
  +-- TelemetryModule
  |     +-- Resources: telemetry://{userId}/today, telemetry://{userId}/7d
  |
  +-- ContextModule
  |     +-- Resources: intake://{userId}/today, budget://{userId}
  |
  +-- ResolverModule
  |     +-- Tools:     resolve_recommendation
  |     +-- Resources: policy://clinical-rules, policy://reference-ranges
  |     +-- Scoring:   ClinicalScorer, ContextualScorer, BudgetScorer, CravingScorer
  |
  +-- PromptsModule
        +-- Prompts:   meal_decision_council, craving_negotiation, daily_briefing
```

### Domain Layer

The domain layer contains pure business logic with no framework dependencies:

| Component | Purpose |
|-----------|---------|
| `clinical-rules.ts` | 20+ declarative rules covering Diabetes T2, Hypertension, CKD, Dyslipidemia, Coeliac, 9 allergen categories, and 4 drug-nutrient interactions. Each rule specifies trigger, constraint, severity, verdict, human-readable text, source citation, and scope. |
| `safety-evaluator.ts` | Evaluates any dish against the full rule set plus ingredient-level allergen cross-referencing via `INGREDIENT_ALLERGEN_MAP`. Returns typed `SafetyVerdict[]` with PASS/WARN/BLOCK status. |
| `types.ts` | Zod schemas for all 14 domain types: `UserProfile`, `LabReport`, `BiometricSnapshot`, `Dish`, `IntakeLog`, `Order`, `NutritionalEnvelope`, `SafetyVerdict`, `ConflictLog`, and more. |
| `allergen-map.ts` | Maps 17 common ingredients (Ghee, Cashew, Prawn, Wheat, etc.) to their allergen categories for cross-referencing beyond declared allergens. |
| `gi-table.ts` | Reference glycemic index values for 10 staple bases (white rice, lentil, wheat, millet, oats, etc.) sourced from Atkinson et al., 2008. |

### Safety Interceptor

The `SafetyInterceptor` is a framework-level guard applied to the resolver tool via `@UseInterceptors(SafetyInterceptor)`. It re-evaluates every dish in the tool's response against the user's safety profile. If any dish in the output carries a BLOCK verdict, the interceptor throws a hard error at the framework level -- ensuring that no blocked dish can ever reach the user, even if the resolver logic contains a bug.

### Scoring Services

The resolver uses four independent, versioned scoring services that each produce a normalized 0-1 score with full component breakdowns:

| Scorer | Version | Dimensions | Key Logic |
|--------|---------|------------|-----------|
| **ClinicalScorer** | `clinical-v1` | Macro alignment (30%), Deficiency uplift (40%), Headroom fit (20%), WARN penalty (10%) | Penalizes overshoot 1.5x harsher than undershoot. Applies glycemic index penalty for diabetic profiles. |
| **ContextualScorer** | `contextual-v1` | Cuisine preference (30%), Spice match (15%), Rating (20%), Variety (15%), Slot match (10%), Weather (10%) | Auto-renormalizes weights when context is unavailable. Tanks disliked cuisines to 0.1. |
| **BudgetScorer** | `budget-v1` | Affordability (40%), Weekly pacing (30%), Value efficiency (30%) | Cost-per-gram-protein analysis. Micronutrient density per rupee. Zero score for over-budget without blocking. |
| **CravingScorer** | `craving-v1` | Dish similarity, Cuisine match, Free-text resolution | Three-tier craving resolution: exact dish ID, cuisine match, free-text with confidence threshold (0.3). Uses cosine-like flavour profile similarity. |

### Similarity Engine

The `similarity.service.ts` computes dish-to-dish similarity using a weighted combination of four dimensions:

- **Flavour profile similarity** (50%) -- Euclidean distance across 6 axes (sweet, salty, sour, spicy, umami, fat)
- **Cuisine family matching** (20%) -- Groups cuisines into families (Indian, Indo-Asian, Western, Modern)
- **Texture tag overlap** (15%) -- Overlap coefficient rather than pure Jaccard to boost partial matches
- **Prep style adjacency** (15%) -- Maps adjacent cooking methods (fried~roasted, steamed~curry)

Designated healthy swaps (`swap_for` field) are guaranteed a minimum similarity floor of 0.75.

---

## System Architecture

![NutriPulse System Architecture](docs/system_architecture.png)

The architecture follows a layered design:

1. **Host LLM Layer** -- ChatGPT, Claude, or any MCP-compatible LLM connects via STDIO or HTTP SSE transport.
2. **MCP Protocol Layer** -- Exposes Tools, Resources, and Prompts following the Model Context Protocol specification.
3. **Module Layer** -- Seven domain modules (Profile, Clinical, Catalog, Telemetry, Context, Resolver, Prompts) each encapsulating their own tools, resources, and prompts.
4. **Domain Layer** -- Pure business logic: clinical rules engine, safety evaluator, allergen mapping, glycemic index reference, and Zod type schemas.
5. **Scoring Layer** -- Four independent scorers feeding into a Pareto optimizer with lexicographic tiebreaking.
6. **Data Layer** -- In-repo JSON data stores for user profiles, lab reports, telemetry snapshots, intake logs, order history, budget state, and a 200+ dish food catalog.
7. **External APIs** -- USDA FoodData Central for nutritional sourcing and Open-Meteo for weather-context scoring.

---

## Dashboard

![NutriPulse Agent Dashboard](docs/dashboard_agent.png)

The NutriPulse agent interface presents a unified view combining:

- **Conversational AI panel** with multi-specialist narration (Clinical, Culinary, Financial advisors)
- **Real-time biometric sidebar** with live telemetry data (heart rate, steps, sleep, stress, hydration)
- **Nutritional envelope visualization** showing macro progress, remaining headroom, and active constraints
- **Safety verdict badges** with color-coded PASS/WARN/BLOCK status for every recommended dish

---

## Core Features

### Nutritional Envelope Computation

The envelope is computed per-user, per-meal-slot, incorporating:

- **BMR Calculation**: Mifflin-St Jeor formula accounting for weight, height, age, and sex
- **TDEE Adjustment**: Replaces static activity multipliers with real telemetry `active_kcal` data when available
- **Intake Subtraction**: Aggregates today's consumed meals from the intake log against the food catalog
- **Slot Allocation**: Distributes remaining daily calories across meal slots (breakfast 20%, lunch 35%, dinner 35%, snack 10%) following ICMR-NIN Indian dietary guidance
- **Hard Constraints**: Fires clinical rules based on conditions, allergies, medications, and lab status. BLOCK-level constraints are absolute.
- **Soft Targets**: Derives macro targets from diet plan, applies deficiency-vector uplifts from labs, and adjusts for telemetry signals:
  - High stress (index >= 60): increases fluid and electrolyte targets
  - Low hydration (< 2000ml): further increases fluid targets
  - Poor sleep (< 6h) or low HR recovery (< 15): boosts protein by 15%, lowers sugar ceiling
  - High step count (>= 10,000): widens carb allowance by 20%

### Multi-Objective Recommendation Resolver

The resolver is the primary entry point for any recommendation query. It:

1. Assembles up to 60 candidate dishes, with forced inclusion of craving anchors and their designated healthy swaps
2. Runs safety evaluation on every candidate, dropping BLOCK-level violations
3. Scores all surviving candidates across four independent dimensions
4. Computes the Pareto-optimal front (epsilon = 0.02)
5. Applies lexicographic tiebreaking: safety warnings, budget cap, craving satisfaction, contextual score, stable dish-ID
6. Generates a conflict log with winner sacrifices, runner-up disqualification reasons, and per-alternative context

### Clinical Safety System

The safety system operates at three reinforcing levels:

1. **Declarative Rules Engine**: 20+ rules covering metabolic conditions, allergens, and drug interactions. Each rule carries a severity, verdict, source citation, and scope (daily or per-meal).
2. **Safety Evaluator**: Ingredient-level allergen cross-referencing beyond declared allergens. Handles 17 ingredient-to-allergen mappings with exceptions for non-dairy milks and similar items.
3. **Safety Interceptor**: Framework-level guard that re-evaluates all outbound dishes and throws hard errors if any BLOCKED dish slips through. This is the absolute final gate.

### Catalog Search with Smart Relaxation

The catalog search supports:

- **Free-text query matching** against dish name, description, and cuisine with weighted scoring
- **12 structured filters**: cuisine, veg, price, rating, restaurant, prep style, allergen exclusion, calorie cap, protein floor, sodium cap, sugar cap, texture tags
- **Near-miss relaxation**: When strict filters return zero results, the system progressively relaxes numeric constraints (sodium cap +50%, calorie cap +30%, protein floor -30%, etc.) and reports exactly which filters were loosened
- **Fallback hierarchy**: relaxed filters, text-only matches, then top-rated dishes as last resort

---

## MCP Capabilities

### MCP Tools

NutriPulse exposes five MCP tools, each with Zod-validated inputs and structured JSON responses:

| Tool | Module | Description |
|------|--------|-------------|
| `resolve_recommendation` | Resolver | **Primary entry point** for any meal recommendation query. Internally computes the nutritional envelope, searches the catalog, applies all clinical safety rules, scores across four objectives, and resolves conflicts via Pareto front. Call this tool alone and first -- do not call `compute_nutritional_envelope`, `search_catalog`, or `check_meal_safety` before it. Returns the winning dish, conflict log, dropped-for-safety list, Pareto summary, and full calculation trace. |
| `compute_nutritional_envelope` | Clinical | Computes the user's per-meal nutritional window including BMR, telemetry-adjusted TDEE, intake subtraction, slot allocation, hard constraints, and soft targets. Use only when the user directly asks about their own targets, limits, or remaining allowance. Not required before `resolve_recommendation`. |
| `check_meal_safety` | Clinical | Evaluates specific dish IDs against the user's clinical profile. Returns per-dish verdicts (PASS/WARN/BLOCK) with rule IDs, thresholds, and actual values. Use only when the user names a specific dish and asks whether they can eat it. Not required before `resolve_recommendation`. |
| `search_catalog` | Catalog | Low-level catalog lookup with filtering and sorting. Returns unvalidated dishes with no safety checking and no clinical filtering. Use only when the user explicitly asks to browse a restaurant menu or look up a specific dish. Never use for recommendations. |
| `ping` | Profile | Smoke test tool that returns server version and timestamp. Used to verify the server is running. |

### MCP Resources

NutriPulse exposes eleven MCP resources organized by domain:

#### User Profile Resources

| URI Pattern | Name | Description |
|-------------|------|-------------|
| `profile://{userId}` | User Profile | The user's medical conditions, allergies, medications, diet plan, taste preferences, and demographic data. Crucial for any nutritional planning. |

#### Clinical Resources

| URI Pattern | Name | Description |
|-------------|------|-------------|
| `labs://{userId}/latest` | Latest Lab Report | Most recent lab report with out-of-range analytes and derived deficiency vectors. Used to enforce clinical rules and uplift targets. |
| `labs://{userId}/history` | Lab Report History | Historical trends across multiple lab reports. Used for longitudinal analysis of analyte progression. |

#### Telemetry Resources

| URI Pattern | Name | Description |
|-------------|------|-------------|
| `telemetry://{userId}/today` | Today's Telemetry | Today's biometric snapshot: steps, active/resting kcal, sleep (duration, deep, REM, efficiency), resting HR, HR recovery, SpO2, hydration, and stress index. Used for immediate dietary adjustments. |
| `telemetry://{userId}/7d` | 7-Day Telemetry Trends | Rolling 7-day biometric trends including computed values: average sleep, sleep debt, average hydration, hydration deficit, average stress, and average HR recovery. Used for longitudinal diet adjustments. |

#### Context Resources

| URI Pattern | Name | Description |
|-------------|------|-------------|
| `intake://{userId}/today` | Today's Intake | Meals consumed today with running totals for kcal, protein, carbs, fat, sodium, sugar, and remaining headroom against daily targets. |
| `budget://{userId}` | Weekly Budget | The user's weekly budget constraint, spend to date, remaining budget, and days remaining in the budget cycle. |

#### Catalog Resources

| URI Pattern | Name | Description |
|-------------|------|-------------|
| `catalog://restaurants` | Restaurant Catalog | List of all available restaurants with IDs, names, and ratings. Used to discover ordering options. |

#### Policy Resources

| URI Pattern | Name | Description |
|-------------|------|-------------|
| `policy://clinical-rules` | Clinical Rules Engine Policy | The complete deterministic logic used to evaluate dishes for safety warnings and blocks based on user biomarkers and conditions. Exposes the raw TypeScript rule definitions. |
| `policy://reference-ranges` | Lab Reference Ranges | Standard reference ranges for all supported lab analytes (HbA1c, Fasting Glucose, Haemoglobin, Ferritin, eGFR, Vitamin D, INR, Creatinine, Potassium, Phosphorus, LDL, HDL, Triglycerides). |

### MCP Prompts

NutriPulse exposes three orchestration prompts that guide the host LLM through structured interaction patterns:

#### `meal_decision_council`

**Purpose**: Resolve a meal decision narrated by a panel of three specialists.

**Arguments**: `userId` (required), `craving` (optional), `budget_override` (optional)

**Behavior**: Instructs the LLM to call `resolve_recommendation` once and only once, then narrate the result as a panel of three specialists:
1. **Clinical Advisor** -- States hard constraints and why they matter, citing rules and real values from the envelope and safety verdicts
2. **Culinary Advisor** -- Speaks to taste fit, cuisine, texture, and craving satisfaction from contextual and craving scores
3. **Financial Advisor** -- States the budget position with exact rupee figures

Then presents the resolution: winning dish, conflict log with exact sacrifices in real units, dropped-for-safety dishes with the specific rule that removed them. BLOCK verdicts are never overridden or argued with.

---

#### `craving_negotiation`

**Purpose**: Negotiate a craving by finding healthier swaps instead of refusing the user.

**Arguments**: `userId` (required), `craved_item` (required)

**Behavior**: Evaluates the craved item's own safety verdict first, then presents healthier alternatives with nutritional delta tables and sensory rationale. Frames the interaction as a swap, never a refusal.

---

#### `daily_briefing`

**Purpose**: Summarize the user's daily biometric state and remaining nutritional allowances.

**Arguments**: `userId` (required)

**Behavior**: Reads telemetry and intake resources, then calls `compute_nutritional_envelope` to generate a comprehensive briefing of the user's biometric state and remaining headroom for the day.

---

## Data Layer

NutriPulse uses an in-repo JSON data store (no external database) organized as follows:

```
data/
  catalog.json              # 200+ dishes with full nutritional profiles
  users/
    u1/
      profile.json          # Demographics, conditions, allergies, medications, diet plan
      labs.json             # Lab reports with panels, reference ranges, deficiency vectors
      telemetry.json        # Daily biometric snapshots from wearables
      history.json          # Order history with timestamps and meal slots
    u2/ ...
    u3/ ...
  cache/                    # USDA API response cache
  runtime/                  # Runtime computed data
  reports/                  # Generated diagnostic reports
```

### User Profile Schema

Each user profile includes:
- **Demographics**: age, sex, height, weight, activity level
- **Chronic conditions**: Diabetes T2, Hypertension, CKD, etc.
- **Allergies**: allergen name + severity (mild/moderate/severe)
- **Medications**: name + drug class (for interaction checking)
- **Diet plan**: type, daily kcal target, macro split percentages
- **Goals**: health objectives (manage blood sugar, increase iron, etc.)
- **Taste preferences**: liked/disliked cuisines, spice tolerance, texture preferences
- **Budget**: daily budget in INR

### Dish Schema

Each dish in the catalog includes:
- Full macros (protein, carbs, fat, fibre, sugar) and micros (sodium, iron, calcium, vitamin D, B12, potassium, vitamin K)
- Glycemic index estimate with confidence level and basis
- Flavour profile (sweet, salty, sour, spicy, umami, fat on 0-1 scale)
- Texture tags, prep style, allergen declarations
- Ingredient list with USDA queries and gram weights
- Price, rating, restaurant ID
- Optional `swap_for` and `conflict_role` fields for craving negotiation

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | TypeScript (Strict), Node.js |
| Framework | NitroStack SDK (`@nitrostack/core` + `@nitrostack/cli`) |
| Validation | Zod (schemas on every tool input and domain type) |
| Protocol | Model Context Protocol (MCP) with dual transport (STDIO + HTTP SSE) |
| Data | In-repo JSON store (no external database) |
| Nutritional Data | USDA FoodData Central API |
| Weather Context | Open-Meteo API |
| Testing | Vitest |
| Deployment | NitroCloud |
| LLM Integration | ChatGPT connector via MCP |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Installation

```bash
cd nutripulse
npm install
```

### Seed the Data

```bash
npm run seed
```

This runs the catalog builder (USDA-sourced dish nutrition) and user profile generator.

### Development

```bash
npm run dev
```

Starts the MCP server in development mode with STDIO transport.

### Production

```bash
npm start
```

Builds and starts with dual transport (STDIO + HTTP SSE) on port 3002.

### Environment Variables

```env
NITRO_LOG_LEVEL=info
TRANSPORT_MODE=dual    # stdio | http | dual
PORT=3002
```

---

## Testing

NutriPulse includes a comprehensive test suite covering the critical paths:

```bash
npm test
```

| Test File | Coverage |
|-----------|----------|
| `envelope.test.ts` | BMR computation, TDEE adjustment, intake aggregation, hard constraint derivation, soft target generation, telemetry adjustments |
| `resolver.test.ts` | End-to-end recommendation resolution, Pareto front computation, lexicographic tiebreaking, conflict log generation |
| `safety.test.ts` | Allergen blocking, drug-nutrient interactions, condition-based constraints, ingredient cross-referencing |
| `scoring.test.ts` | Clinical scorer, contextual scorer, budget scorer, craving scorer, similarity engine |
| `search-catalog.test.ts` | Text scoring, filter application, near-miss relaxation, sort ordering |

---

## License

Hackathon project -- Amrita University MCP Hackathon 2026.

---

Built with NitroStack -- [docs.nitrostack.ai](https://docs.nitrostack.ai)
