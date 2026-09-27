# PolyRisk

> A transparent, evidence-backed polygenic risk score (PRS) MCP server — reasoning live over real GWAS Catalog and PubMed data, not canned outputs.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen)

**PolyRisk** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with a new, real-world capability: evidence-transparent genetic risk interpretation. It is built and deployed on [Nitrostack](https://nitrostack.ai), the fastest way to build, deploy, and share MCP apps.

## Table of Contents

- [Overview](#overview)
- [Disease Coverage](#disease-coverage)
- [Demo-Ready Sample Sets](#demo-ready-sample-sets)
- [Data Sources](#data-sources)
- [What is MCP?](#what-is-mcp)
- [The 8 Tools](#the-8-tools-in-order)
- [Evidence Filtering Criteria](#evidence-filtering-criteria)
- [Widgets](#widgets)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Demo Script](#demo-script-t2d)
- [Architecture](#architecture)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

## Overview

PolyRisk calculates evidence-backed polygenic risk scores (PRS) by pulling live data from the NHGRI-EBI GWAS Catalog and NCBI PubMed, reasoning through which studies are reliable enough to include, and producing a transparent, citation-backed report.

The gene panel covers **34 conditions across 6 categories** (see [Disease Coverage](#disease-coverage) below), with **3 diseases — Type 2 Diabetes, Coronary Artery Disease, and Age-Related Macular Degeneration — fully wired end-to-end** with dedicated demo sample sets, lifestyle-context modules, and a complete demo script (see [Demo-Ready Sample Sets](#demo-ready-sample-sets)).

Every result traces back to a real, peer-reviewed study via live citation — nothing is fabricated. Built as an agentic MCP pipeline, the system autonomously evaluates evidence strength and statistical significance before surfacing any finding, rather than following a fixed, hardcoded script.

**This is an educational and evidence-transparency tool — NOT a diagnostic or medical device.**

## Disease Coverage

The gene panel covers 34 conditions across 6 categories:

| Category | Conditions |
|---|---|
| Metabolic | Type 2 Diabetes, Obesity |
| Cardiovascular | Coronary Artery Disease, Atrial Fibrillation, Stroke, Long QT Syndrome, Hypertension, Venous Thromboembolism |
| Neurological/Psychiatric | Alzheimer's, Parkinson's, Bipolar Disorder, Schizophrenia, Depression, Migraine |
| Autoimmune/Inflammatory | Celiac Disease, Type 1 Diabetes, Rheumatoid Arthritis, Lupus, Crohn's Disease, Psoriasis, Ankylosing Spondylitis, Hashimoto's/Graves' Disease |
| Respiratory/Allergic | Asthma, Eczema |
| Cancer | Breast, Ovarian, Prostate, Colorectal |
| Eye | AMD, Glaucoma |
| Other | Chronic Kidney Disease, Osteoporosis, Gout, NAFLD |

> **Note:** this coverage is based on each gene's primary known association from research literature. The exact disease/trait names in actual output come from **live GWAS Catalog data at runtime**, so treat this list as expected coverage rather than a hard guarantee — the final confirmed list is validated by running the full pipeline end-to-end.

## Demo-Ready Sample Sets

Of the 34 conditions above, three have a fully wired, pre-built demo path — dedicated sample-set keys, complete lifestyle-context modules, and a documented demo script:

| Disease | Sample Set Key | Key Variants |
|---|---|---|
| Type 2 Diabetes | `T2D_SAMPLE` | TCF7L2, IGF2BP2, CDKAL1, HHEX, SLC30A8 |
| Coronary Artery Disease | `CAD_SAMPLE` | 9p21.3 locus (CDKN2A/B) |
| Age-Related Macular Degeneration | `AMD_SAMPLE` | CFH, ARMS2 |

These three were chosen because they have robust, heavily-replicated GWAS evidence — PRS reliability varies enormously by how well a disease's genetic architecture is characterized. Any rsID for the other 31 conditions can still be run through `parse_variants` manually (not via a pre-built `sampleSet` key).

## Data Sources

- **[NHGRI-EBI GWAS Catalog](https://www.ebi.ac.uk/gwas/)** — Live REST API for association data, effect sizes, sample sizes, and ancestry information
- **[NCBI PubMed E-utilities](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/)** — Live API for citation details (title, authors, journal, year)

All data is fetched in real time. Results are cached within a session. If either API is unavailable, hardcoded fallback data from published literature is used.

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

## The 8 Tools (in order)

1. **`parse_variants`** — Validate rsIDs; or load a pre-built demo sample set
2. **`fetch_gwas_associations`** — Query GWAS Catalog for associations with the target disease
3. **`filter_evidence`** ⭐ — Core reasoning step: include/exclude studies with specific, human-readable reasons
4. **`calculate_prs`** — Weighted-sum PRS using log(OR) × genotype per included variant
5. **`fetch_citations`** — Retrieve real PubMed citations for included studies
6. **`interpret_risk`** — Convert PRS to a risk tier (low/moderate/high) with a confidence level
7. **`get_lifestyle_context`** — Evidence-based, modifiable lifestyle factors for the disease
8. **`generate_report`** — Full structured report combining all outputs above

## Evidence Filtering Criteria

Applied in Tool 3 (`filter_evidence`) — this is the core scientific reasoning step:

| Criterion | Threshold | Rationale |
|---|---|---|
| P-value | p < 5×10⁻⁸ | Genome-wide significance standard |
| Sample size | n ≥ 1,000 | Below this, effect size estimates are unstable |
| Effect size | Must have OR or β | Cannot contribute to weighted-sum without it |
| Ancestry | Flagged if single non-European ancestry | Effect sizes may not transfer across populations |
| Superseded | Excluded if a larger study exists for the same variant | Retains the best-powered result per variant |

## Widgets

- **Evidence Filtering Visualizer** — Bound to `filter_evidence`. Cards animate to included/excluded with specific per-study reasons. Click to expand full study details and PubMed links.
- **Risk Report** — Bound to `generate_report`. Gauge dial for risk tier, confidence level, per-variant PRS breakdown, real PubMed citations, lifestyle context, and a prominent disclaimer. Tabs: Summary · Variants · Citations · Lifestyle.

## Getting Started

### Prerequisites

- Node.js 18+
- An MCP-compatible client (Claude Desktop, Cursor, NitroStudio, etc.)

### Installation

```bash
git clone https://github.com/aditi007sriram/PolyRisk
cd PolyRisk-DNA
npm install
```

### Configuration

Copy the example environment file and add your own values:

```bash
cp .env.example .env
```

### Run (development)

```bash
npm run dev
```

Widgets run on port `3001` (Next.js). The MCP server itself runs over STDIO in development.

### Run (production)

```bash
npm run start
```

## Connect to an MCP Client

Add this server to your MCP client configuration. A typical entry looks like:

```json
{
  "mcpServers": {
    "polyrisk": {
      "command": "npm",
      "args": ["run", "dev"]
    }
  }
}
```

Restart your client and the tools from this MCP server will be available to your AI assistant.

## Demo Script (T2D)

1. `parse_variants` — `sampleSet=T2D_SAMPLE`
2. `fetch_gwas_associations`
3. `filter_evidence` — watch the evidence-filter widget animate cards
4. Click an excluded card to see the specific exclusion reason
5. Click a PubMed link to confirm it's a real paper
6. `calculate_prs` → `fetch_citations` → `interpret_risk` → `get_lifestyle_context`
7. `generate_report` — switch to the risk-report widget
8. Navigate tabs: Summary / Variants / Citations / Lifestyle

## Architecture

```
src/
├── types.ts
├── app.module.ts
├── modules/
│   ├── variant/       parse_variants, disease://{condition}/known-variants resource
│   ├── evidence/      fetch_gwas_associations, filter_evidence, fetch_citations
│   ├── scoring/       calculate_prs
│   └── report/        interpret_risk, get_lifestyle_context, generate_report, explain_polyrisk_finding prompt
└── widgets/app/
    ├── evidence-filter/page.tsx
    └── risk-report/page.tsx
```

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[Nitrostack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

👉 **Start building:** [https://nitrostack.ai](https://nitrostack.ai)

## Explore More MCP Apps

- 🌙 Discover and share MCP projects with the community on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- 🧰 Browse a growing catalog of MCP apps on [Nitrostack](https://nitrostack.ai/apps)

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

### What does PolyRisk do?

PolyRisk calculates evidence-backed polygenic risk scores by pulling live data from the GWAS Catalog and PubMed, reasoning through which studies are reliable enough to include, and producing a transparent, citation-backed report. Its gene panel covers 34 conditions across 6 categories, with 3 diseases — Type 2 Diabetes, Coronary Artery Disease, and Age-Related Macular Degeneration — fully wired with dedicated demo sample sets.

### Is PolyRisk a diagnostic tool?

No. It's an educational and evidence-transparency tool, explicitly not intended for medical diagnosis.

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop, Cursor, and NitroStudio. New clients are adding MCP support regularly.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

## Keywords

`HealthTech & Life Sciences` · `PolyRisk` · `Polygenic Risk Score` · `GWAS Catalog` · `PubMed` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `deploy MCP server` · `build MCP app`

## License

MIT © 2026

---

Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).
