# Community posts (McpToTheMoon Discord + Reddit)

Copy-paste and add your deployed link + a 20-sec GIF/screenshot. Post in the
McpToTheMoon Discord showcase channel and r/mcp (or the hackathon's subreddit).

---

## Discord (McpToTheMoon showcase)

🚀 **Personal Finance & Tax Copilot** — built on NitroStack for the Amrita × NitroStack hackathon.

Ask it *"I earn ₹30L, invested in HDFC Top 100, home loan at 9% — plan my taxes and should I invest or prepay?"* and it:
• compares old vs new tax regime on **real Finance Act 2025 slabs**
• values your fund with **live AMFI NAV** → real XIRR (nothing mocked)
• runs a **deterministic advisory council** (tax / growth / safety lenses → weighted vote) — multi-agent debate with **zero extra LLM calls and zero hallucinated numbers**
• verifies your bank via live Razorpay IFSC, surfaces filing deadlines

16 tools · 8 resources (incl. a *live* market snapshot) · 3 prompts · 15 interactive widgets — all pure NitroStack, plus rate-limiting, input hardening and a `node --test` suite.

🔗 Live: <your-nitrocloud-link>
🎥 Demo: <your-2min-video>

Feedback welcome! 🙏

---

## Reddit (r/mcp or hackathon subreddit)

**Title:** I built a finance & tax copilot MCP server on 100% live Indian data (no mocks) — with a deterministic "agent council"

**Body:**

For the Amrita University × NitroStack MCP hackathon I built a **Personal Finance & Tax Copilot** — an MCP server that any host (Claude, ChatGPT, NitroChat) turns into a plain-English finance assistant for Indian taxpayers.

The two things I'm proud of:

1. **Everything is live, keyless, and real.** Mutual-fund NAVs come from AMFI (via MFAPI.in), bank verification from Razorpay's public IFSC API, and tax is computed on the actual Finance Act 2025 slabs. There's even a `get_data_freshness` tool that timestamps each source so you can *see* it's not mocked.

2. **A deterministic "advisory council" instead of an LLM swarm.** For "should I invest my surplus or prepay my loan?", three pure-logic lenses (tax minimization / long-term growth / liquidity-and-safety) each score the options and a reconciler picks a weighted winner. It reads like a multi-agent debate, but it costs **zero extra LLM calls, is 100% reproducible, and can never hallucinate a number** (there's a test asserting byte-identical output).

Tech: NitroStack TypeScript SDK — 16 tools, 8 resources (including a live market snapshot built from the AMFI scheme master), 3 prompts, 15 React widgets, plus rate-limiting, input coercion, a global exception filter and unit tests.

Live demo: <your-nitrocloud-link>
2-min video: <your-2min-video>

_Informational/educational only — not investment or tax advice._

Happy to answer questions about the deterministic-council pattern or wiring live data into MCP resources.
