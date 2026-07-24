#  InvoiceX-Ray — TBML Detection MCP Server

> **Trade-Based Money Laundering (TBML) Detection Agent for Indian AD-Bank Trade Finance under FEMA 2026**  
> Built with **Nitrostack SDK** · **Model Context Protocol (MCP)** · **TypeScript** · **PostgreSQL / Supabase**

---

## 🌟 Overview & Problem Statement

**InvoiceX-Ray** is a specialized Model Context Protocol (MCP) server that empowers AI agents and compliance officers to detect Trade-Based Money Laundering (TBML) in Letter of Credit (LC) and Export-Import finance.

### What It Does
Unlike simple document OCR or basic text summarizers, InvoiceX-Ray is a **multi-layered cross-referencing engine**. It identifies the structural manipulation gap in trade transactions — over/under-invoicing, phantom shipments, duplicate billing, and illegal offshore capital flight — by cross-analyzing declared invoice valuations against independent commodity benchmarks, customs records, and regulatory timelines simultaneously.

### The FEMA 2026 Regulatory Environment
Under India's **Foreign Exchange Management (Export and Import) Regulations, 2026** (effective October 1, 2026):
- **Tightened Realization Windows**: Strict timelines for export proceed realizations monitored via RBI's EDPMS/IDPMS networks.
- **Severe Financial Exposure**: Section 13 mandates **penalties up to 300% of transaction value** for unauthorized delays or valuation manipulation.
- **Bank Liability**: Authorized Dealer (AD) Category-I banks carry direct regulatory liability for every unflagged trade transaction.

---

## 🚀 Key Features & Innovations

1. **Counterfactual Valuation Engine**
   Instead of presenting abstract percentages, InvoiceX-Ray generates a concrete **Counterfactual View**:
   > *"This shipment declares $1,475,000 for 500 oz of Gold Bullion ($2,950/oz). At the current market spot benchmark of $2,200/oz, the shipment should cost $1,100,000. The $375,000 gap is the suspected illicit capital flight transfer."*

2. **Dynamic AI Commodity Benchmarking**
   - **World Bank API Integration**: Live macroeconomic inflation scaling (`FP.CPI.TOTL.ZG`) dynamically adjusts commodity benchmark baselines.
   - **On-the-Fly Benchmark Generation**: If a commodity benchmark is missing from the database, the server queries **Groq AI (`llama-3.3-70b-versatile`)** to calculate realistic spot prices and 90-day distribution statistics, automatically saving and caching them to PostgreSQL.

3. **Multi-Verification Toolset (11 MCP Tools)**
   - **DGFT IEC Validation**: Verifies Importer-Exporter Code caution-listing status via registrar records.
   - **ICEGATE Customs Verification**: Detects weight discrepancies between invoice declarations and port container weights.
   - **OpenSanctions PEP/Sanction Check**: Live API screening against global watchlists (OFAC, UN, EU).
   - **Maritime Route Feasibility**: Evaluates geospatial routing anomalies (e.g. vessel shipments to landlocked destinations like Zurich).
   - **Double-Financing Detection**: Cross-checks shipping bills across different AD Bank IFSC codes to prevent duplicate loan filings.

4. **Automated Regulatory Document Generation**
   - **FIU-IND Suspicious Transaction Report (STR)**: Full narrative drafting powered by Groq LLM.
   - **RBI Form ETX**: Automated drafting of extension/write-off applications for overdue bills.
   - **HTML Audit Reports**: Print-ready, executive-level counterfactual valuation reports.

5. **Dual MCP Transport**
   - Standard **`stdio`** transport for direct CLI/IDE integration.
   - **Express `sse` (Server-Sent Events)** transport for web dashboard connections.

---

## 🏗 System Architecture

```
┌──────────────────────────────────────────────────────────┐
│          Trade Finance Dashboard (Next.js + Recharts)    │
│          Counterfactual View: Declared vs Benchmark      │
│                        [Member 4]                        │
└──────────────────────┬───────────────────────────────────┘
                       │ MCP Client (Stdio / SSE)
                       ▼
┌──────────────────────────────────────────────────────────┐
│              Nitrostack MCP Server  [Member 1]           │
│                                                          │
│  RESOURCES                TOOLS              PROMPTS     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────┐ │
│  │ Invoice Feed    │  │ Price Deviation │  │ STR Gen  │ │
│  │ (txns + shipping│  │ (z-score, IQR,  │  │ Template │ │
│  │  docs)          │  │  counterfactual)│  │          │ │
│  │                 │  │                 │  │ Red Flag │ │
│  │ Benchmark Feed  │  │ Timeline Risk   │  │ Summary  │ │
│  │ (spot + 90d     │  │ (FEMA 300%      │  └──────────┘ │
│  │  stats + IQR)   │  │  penalty)       │                │
│  │                 │  │                 │                │
│  │ EDPMS Status    │  │ Counterparty    │                │
│  │ (realization    │  │ Pattern Scanner │                │
│  │  + FETERS)      │  │                 │                │
│  └─────────────────┘  │ Sanctions, DGFT,│                │
│                       │ ICEGATE, FormETX│                │
│                       └─────────────────┘                │
│                   DbDataProvider Interface                │
└─────────────┬──────────────────────┬─────────────────────┘
              │                      │
              ▼                      ▼
┌─────────────────────┐  ┌─────────────────────────────────┐
│   Groq / World Bank │  │   PostgreSQL / Supabase         │
│  (AI Reasoning &    │  │  (Trade txns, HS benchmarks,    │
│   Inflation Data)   │  │   EDPMS records)                │
│    [Member 3]       │  │    [Member 2]                   │
└─────────────────────┘  └─────────────────────────────────┘
```

---

## 🛠 MCP Primitives Reference

### Resources (Data Streams)

| URI | Description |
|-----|-------------|
| `trade-invoice-feed://all` | Returns all LC/Export trade transaction records with shipping documentation |
| `trade-invoice-feed://{invoice_id}` | Templated resource to retrieve individual transaction details |
| `commodity-benchmark://all` | Global commodity market price reference table by HS Code |
| `edpms-realization-status://all` | RBI EDPMS realization records with countdown timelines and realization status |

### Tools (Detection Logic & Actions)

| Tool Name | Input Arguments | Description |
|-----------|-----------------|-------------|
| `list_all_transactions` | `{}` | Retrieves all stored trade transactions |
| `check_price_deviation` | `invoice_id` | Cross-references unit price against benchmark z-score & IQR; returns counterfactual gap |
| `check_timeline_risk` | `exporter_id` | Checks EDPMS realization deadlines; calculates 300% FEMA penalty exposure |
| `check_counterparty_pattern` | `entity_id` | Scans for identical value repeats, rapid succession, and round-trip invoicing |
| `verify_dgft_iec` | `iec`, `pan` | Verifies DGFT registration and caution-listing status |
| `verify_icegate_customs` | `shipping_bill_no`, `port_of_loading`, `declared_weight` | Cross-checks declared cargo weight against customs records |
| `check_sanctions` | `entity_name`, `country_code` | Screens entities against OpenSanctions PEP/OFAC watchlists |
| `check_routing_risk` | `port_of_loading`, `port_of_discharge` | Evaluates maritime shipping feasibility and landlocked port risks |
| `check_double_financing` | `shipping_bill_no`, `ad_bank_code` | Detects duplicate shipping bill filings across AD banks |
| `generate_counterfactual_report` | `invoice_id` | Generates a print-ready HTML audit report |
| `generate_rbi_filing` | `invoice_id` | Generates an official RBI Form ETX draft for overdue bills |
| `draft_str` | `flags_list`, `transaction_details`, `counterfactual` | Synthesizes accumulated flags into an FIU-IND compliant STR narrative |

### Prompts (LLM Templates)

| Prompt | Description |
|--------|-------------|
| `str_generation_template` | AML Compliance Officer prompt for formal STR drafting under FEMA 2026 |
| `red_flag_summary_template` | Executive summary prompt for relationship managers and credit committees |

---

## 👥 Team Responsibilities & Handoff

| Role | Member | Responsibilities | Artifact Link |
|------|--------|------------------|---------------|
| **MCP Architect** | Member 1 | Nitrostack setup, MCP schemas, detection tools, transport routing | [walkthrough.md](file:///home/devang/.gemini/antigravity/brain/125af709-ec63-4b47-b71a-92a5a3c073b2/walkthrough.md) |
| **Data Synthesizer** | Member 2 | Supabase DDL schema, PostgreSQL provider, synthetic data seeder | [member2_handoff.md](file:///home/devang/.gemini/antigravity/brain/125af709-ec63-4b47-b71a-92a5a3c073b2/member2_handoff.md) |
| **AI Engineer** | Member 3 | Groq/Claude API integration, prompt templates, STR narrative generation | [mcp_integration_guide.md](file:///home/devang/.gemini/antigravity/brain/125af709-ec63-4b47-b71a-92a5a3c073b2/mcp_integration_guide.md) |
| **UI/UX Specialist** | Member 4 | React/Next.js dashboard, Recharts counterfactual view, STR editor | [member4_handoff.md](file:///home/devang/.gemini/antigravity/brain/125af709-ec63-4b47-b71a-92a5a3c073b2/member4_handoff.md) |

---

## 💻 Quick Start & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL or Supabase Database

### Setup Instructions

1. **Clone & Install Dependencies**:
   ```bash
   git clone https://github.com/DevNarayanU/MCP-Nitro.git
   cd nitrostack
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   SERVER_NAME=invoicex-ray
   SERVER_VERSION=1.0.0
   MCP_TRANSPORT=stdio # "stdio" or "sse"
   PORT=3000

   # Database Connection
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"

   # AI & External APIs (Optional for live LLM features)
   GROQ_API_KEY="your-groq-api-key"
   GROQ_MODEL="llama-3.3-70b-versatile"
   OPENSANCTIONS_API_KEY="your-opensanctions-api-key"

   # Thresholds
   PRICE_DEVIATION_THRESHOLD=20
   TIMELINE_RISK_DAYS=15
   ```

3. **Database Migration & Seeding**:
   Run the seeding script to create PostgreSQL tables and populate clean + planted TBML transactions:
   ```bash
   npm run seed
   ```

4. **Run Server**:
   ```bash
   # Development mode with hot-reload
   npm run dev

   # Production build & start
   npm run build
   npm run start:prod
   ```

### MCP Client Configuration (`stdio`)

Add this configuration to your Claude Desktop or MCP Client settings (`mcpServers`):
```json
{
  "mcpServers": {
    "invoicex-ray": {
      "command": "node",
      "args": ["/path/to/nitrostack/dist/index.js"]
    }
  }
}
```

---

## 📜 Regulatory Reference Framework

- **FEMA 2026**: Foreign Exchange Management (Export and Import Regulations), 2026 (Section 13 Penalties).
- **RBI Master Direction on KYC/AML**: Master Direction - Know Your Customer (KYC) Direction, 2016 (updated 2026).
- **FIU-IND Reporting Format**: Financial Intelligence Unit - India Suspicious Transaction Report guidelines.
- **FATF TBML Typologies**: Financial Action Task Force Guidance on Trade-Based Money Laundering.

---

## 📄 License

Distributed under the MIT License.
