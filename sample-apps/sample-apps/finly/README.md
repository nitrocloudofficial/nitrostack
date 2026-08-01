# Finly — MCP app

**Money answers that survive a bad month.**

Team **Code Beetles** · Track 01, BFSI & FinTech · Nitrostack × Amrita University Coimbatore

- **Live** — <https://finly-6a654b79-aparnas-org-0dc96b3d.app.nitrocloud.ai>
- **MCP endpoint** — `…/mcp` (streamable HTTP) or `…/sse`
- **Full project** — <https://github.com/ananyaperi/finly> (this folder is the MCP app; the repo also holds a FastAPI backend and a React client)

---

## What it does

Finly explains money in plain language and protects people from being sold
products they were never taught to evaluate. It serves two groups:

- **People whose income is not a salary** — delivery riders, daily-wage earners,
  shop owners. Every finance tool assumes a fixed monthly figure. Theirs does not
  arrive that way.
- **People buying a financial product for the first time** — who read perfectly
  well but were never taught what to ask.

### The rule that shapes every answer

**Affordability is judged against a weak month, not an average one.** For
irregular income the mean is close to meaningless — what governs someone's life
is how bad a bad month is.

Six months of gig earnings — ₹14,000 · 22,000 · 16,000 · 19,000 · 12,000 · 21,000 —
against ₹9,000 of must-pay costs and a ₹6,000 monthly commitment:

| | |
| --- | --- |
| Average month | ₹17,333 — covers it comfortably. Most tools would say yes. |
| Weakest month | ₹14,000 — **₹2,400 short**. Finly says not yet. |
| Safe each month | ₹3,600 |

With four or more months recorded the **second-lowest** month is used rather than
the lowest, so one freak month does not decide every answer.

---

## Tools

| Tool | What it returns | Widget |
| --- | --- | --- |
| `check_affordability` | A yes / tight / not-yet verdict on a recurring commitment, judged against the weak month, with the shortfall | `affordability` |
| `show_money_position` | Income pattern, runway in days, safe monthly commitment, emergency-fund target and the gap to it | `money-position` |
| `check_product_cost` | What stopping a policy early costs — paid in, surrender value, loss in rupees and percent, plus questions to ask before signing | `product-cost` |
| `life_event_roadmap` | An ordered five-step plan for a first job, a marriage or a house, sized against the user's own must-pay costs | `roadmap` |
| `explain_money_term` | A plain-language definition from a curated 14-term glossary, with what to watch out for | — |

All arithmetic lives in `src/modules/finly/finly.service.ts` as pure functions.
The tool layer in `finly.tools.ts` only validates input, calls the service and
shapes the response — so a model can never invent a figure it was supposed to
calculate.

### Input is deliberately forgiving

Hosts send array inputs in inconsistent shapes. NitroStudio renders an array
field as a text box and posts `"12000, 30000, 14000"` as a single string; other
clients post `["12000", "30000"]`. Both used to break — the second one silently,
by concatenating rather than adding, so an average came back as
`3000075000350007000`. A wrong number that looks like a number is the worst
failure mode here, so `toPositiveNumbers()` and `splitNumberList()` normalise
strings, arrays and lone numbers. The comma is both a separator and a digit-group
marker in India, so `₹12,000` must not become `12` and `000`.

## Widgets

Four React widgets under `src/widgets/app/`. Shared primitives are in
`src/widgets/lib/widget.tsx`.

Two decisions worth knowing before extending them:

- **`hasFields()` guards every render.** `{}` is truthy in JavaScript, so
  `if (!data)` passed on an empty payload and the widget rendered `₹NaN` beside a
  confident-looking verdict. Widgets now check that the fields they read are
  actually present.
- **No legend, no axis ticks.** Reading a colour out of a key is itself a reading
  task, and this product does not assume reading fluency. Bars are labelled where
  they stand, and a bar that fails its threshold is striped as well as coloured,
  so the verdict survives for anyone who cannot separate red from green.

---

## Running it

Requires **Node 20**.

```bash
npm install
npm run dev          # then open this folder in NitroStudio
```

Production:

```bash
npm run build
npm start
```

The server speaks both stdio and HTTP. In production it defaults to dual
transport and exposes `/mcp` and `/sse`. No API keys are needed — every tool is
pure arithmetic over the figures the caller supplies, with no network calls and
no database.

### Connect it to a client

```jsonc
{
  "mcpServers": {
    "finly": {
      "url": "https://finly-6a654b79-aparnas-org-0dc96b3d.app.nitrocloud.ai/mcp"
    }
  }
}
```

Verified working from **ChatGPT**, **Cursor** and **NitroStudio**.

## Tests

```bash
npm run build
node verify.mjs          # 61 checks
node check-widgets.mjs   # 31 checks
```

| Suite | Why it exists |
| --- | --- |
| `verify.mjs` | This service is a port of the Python tools in the main repo. Two copies of the same maths drift unless something checks. It pins the weak-month rule, the verdict thresholds, and every loose-input shape listed above. |
| `check-widgets.mjs` | A contract test between each tool and its widget. A tool can be perfectly correct and still render as nothing if it returns `weak_month` where the widget reads `weakMonth`, and nothing else in the project would catch that. |

---

## What this app refuses to do

These are deliberate limits, not unfinished work.

- **It will not name a product to buy.** Recommending a specific fund, policy or
  scheme is regulated activity in India, restricted to SEBI-registered persons.
  The tools explain how product types work, what they cost, and what to ask
  instead.
- **It will not claim to know what a product pays its seller.** That needs a
  verified IRDAI/SEBI/AMFI dataset which does not exist. `check_product_cost`
  scores what the seller *disclosed* rather than guessing at commission.
- **It will not predict returns.** No growth rate is hardcoded anywhere; any rate
  must be supplied by the caller so it stays visible at the point of use.

---

*Finly is an educational tool. It explains how money works and what a person's
own figures say. It does not provide regulated financial advice.*
