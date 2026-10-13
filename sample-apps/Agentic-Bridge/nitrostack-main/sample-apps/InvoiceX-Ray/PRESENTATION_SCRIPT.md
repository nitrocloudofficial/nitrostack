# 🎙️ InvoiceX-Ray — 3-Minute Presentation Script

> **Target Duration**: 3 Minutes (~420 Spoken Words)  
> **Topic**: Trade-Based Money Laundering (TBML) Detection Agent for Indian AD-Bank Trade Finance under FEMA 2026

---

### ⏱️ [0:00 - 0:35] Slide 1: The Invisible $300 Billion Crime & FEMA 2026

**[SLIDE 1 VISUAL: Title Slide — Bold Red Alert: "FEMA 2026: 300% Section 13 Penalty"]**

> Every single day, hundreds of millions of dollars leave developing economies like India without firing a shot or breaking a bank vault. How? Through **Trade-Based Money Laundering**. 
> 
> The paperwork is genuine. The customs shipping bills are real. The Letters of Credit are stamped by Authorized Dealer Banks. But behind the scenes, the **valuation is completely fake**.
> 
> Starting October 1, 2026, India's new **FEMA Regulations** change everything. Section 13 imposes **penalties up to 300% of transaction value** on AD Banks for unrecovered export proceeds or valuation fraud. Existing legacy tools miss it because they inspect documents in isolation. We built **InvoiceX-Ray** to stop it.

---

### ⏱️ [0:35 - 1:15] Slide 2: The Innovation — Counterfactual View

**[SLIDE 2 VISUAL: Dashboard Screenshot — Declared FOB ($1.475M) vs Market True Value ($1.1M)]**

> Why do traditional compliance tools fail? Because showing an auditor a raw alert like *"Price deviation = 34%"* tells them nothing about real financial risk.
> 
> InvoiceX-Ray introduces the **Counterfactual View**. Instead of complex math, we instantly prove the fraud in plain language:
> 
> *"This invoice declares **$1,475,000** for 500 ounces of Gold Bullion at **$2,950 an ounce**. Cross-referencing live market benchmarks reveals the true spot price is **$2,200 an ounce**—meaning this cargo actually costs **$1,100,000**. The **$375,000 difference** is an illegal capital flight transfer."*
> 
> In one single glance, non-specialist compliance officers see the exact illicit gap.

---

### ⏱️ [1:15 - 2:05] Slide 3: The Engine — Nitrostack MCP Server & 11 Live Tools

**[SLIDE 3 VISUAL: MCP Architecture Diagram — Nitrostack Server, Groq AI, World Bank & Supabase]**

> InvoiceX-Ray is built on **Nitrostack** using the **Model Context Protocol (MCP)**. It runs **11 specialized verification tools** concurrently across 4 dimensions:
> 
> 1. **Dynamic Macro-Inflation**: Connects to the **World Bank API** for live inflation scaling, paired with **Groq AI** to calculate dynamic market statistical bands for ANY commodity on-the-fly.
> 2. **Regulatory & Customs Checks**: Queries **DGFT registrar records** for caution-listed exporter licenses and checks **ICEGATE Customs** for container weight mismatches.
> 3. **Sanctions & Geospatial AI**: Screens entities via **OpenSanctions** and flags impossible maritime routes—like cargo ships discharging in **landlocked Zurich, Switzerland**!
> 4. **Double-Financing Audit**: Cross-checks shipping bills across different bank IFSC codes to detect duplicate loan filings.

---

### ⏱️ [2:05 - 2:40] Slide 4: Real-World Output — Automated STR & RBI Form ETX

**[SLIDE 4 VISUAL: Live Output Modal — Automated FIU-IND STR Narrative & RBI Form ETX Export]**

> Detecting the fraud is only half the battle. Reporting it quickly protects the bank from FEMA fines.
> 
> InvoiceX-Ray automatically synthesizes all red flags into a formal **FIU-IND Suspicious Transaction Report (STR)** narrative within seconds using LLM reasoning.
> 
> It also auto-generates official **RBI Form ETX** filings for overdue export bills and builds print-ready, executive-level **HTML Audit Reports**. What used to take a compliance team 3 full days now takes **under 5 seconds**.

---

### ⏱️ [2:40 - 3:00] Slide 5: Impact & Conclusion

**[SLIDE 5 VISUAL: Summary Slide — 4-Layer Architecture & Contact Information]**

> Our project was bootstrapped with a 4-layer team architecture:
> - **Member 1**: MCP Architect (Nitrostack backend & tool routing)
> - **Member 2**: Data Synthesizer (Supabase PostgreSQL & benchmarks)
> - **Member 3**: AI Engineer (Groq LLM narrative synthesis)
> - **Member 4**: UI Specialist (Next.js & Recharts frontend)
> 
> InvoiceX-Ray protects Indian AD Banks from catastrophic FEMA penalties while stopping trade-based money laundering in its tracks. 
> 
> Thank you—let's make trade finance transparent!
