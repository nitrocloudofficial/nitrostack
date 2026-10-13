# ALE SCM — AI Client Rules

> This file is the canonical instruction set for every AI client operating in this project
> (Antigravity, Gemini, Claude, Cursor, Copilot, Codex).  
> All AI clients **must** follow these rules without exception.

---

## 1. Tool Calling — ALWAYS invoke real MCP tools

**Rule**: When a user asks you to run a workflow, fetch analytics, or perform any operation
that has a corresponding MCP tool, you MUST invoke that tool via a real tool call.
**Never** simulate, approximate, or fabricate results in plain text.

| User intent | Correct tool to call | Never do this |
|---|---|---|
| "run the invoice workflow" | `execute_workflow` with `workflowId: "invoice_processing"` | Write a speculative summary without calling the tool |
| "what is my STP rate" | `get_invoice_analytics` | Check system health checks instead |
| "show exception breakdown" | `get_exception_breakdown` | Make up exception counts |
| "screen this vendor" | `compliance_screen_vendor` | Guess compliance status |
| "get alert status" | `get_alert_status` | Assume alert was delivered |

### execute_workflow — expected outcomes
The pipeline has five valid terminal states. All of them are handled by the widget —
do NOT produce alternative UI for any of them:

| status | Meaning |
|---|---|
| `Auto-approved` | Invoice matched PO, AP record created |
| `Pending-approval` | Invoice above auto-approval threshold, awaiting manual sign-off |
| `Duplicate` | Invoice number already processed |
| `Flagged` | Price or quantity mismatch detected, routed to finance_team |
| `exception` | Compliance BLOCKED (vendor on denied-parties list) **or** missing PO |

> ⚠️ `exception` / BLOCKED is **not** an error in the server — it is a designed workflow
> outcome. The `@Widget('invoice-result')` React component handles all states including BLOCKED.
> Do not replace it with a warning banner or speculative UI.

---

## 2. JSON Patch / UI Spec Schema — strict rules

When generating UI spec JSON Patch operations for chat responses, every operation
**must** comply with the following rules.

### 2.1 Every element property lives inside `props`

```jsonc
// ✅ CORRECT
{"op":"add","path":"/elements/my-alert","value":{
  "type":"Alert",
  "props":{"title":"Success","message":"Done.","type":"success"},
  "children":[]
}}

// ❌ WRONG — title/message/type at root of value
{"op":"add","path":"/elements/my-alert","value":{
  "type":"Alert",
  "title":"Success",
  "message":"Done.",
  "type":"success"
}}
```

### 2.2 `children` must always be present

Every element object must have a `"children":[]` key, even if it has no children.

```jsonc
// ✅ Leaf element with no children
{"op":"add","path":"/elements/badge","value":{"type":"Badge","props":{"text":"OK","variant":"success"},"children":[]}}

// ❌ Missing children key
{"op":"add","path":"/elements/badge","value":{"type":"Badge","props":{"text":"OK","variant":"success"}}}
```

### 2.3 Every JSON Patch object must be well-formed

Each line in the spec block is a complete, self-contained JSON object.
Count your braces and brackets — unclosed objects will silently fail.

```jsonc
// ✅ Complete object — all braces closed
{"op":"add","path":"/elements/table","value":{"type":"Table","props":{"columns":["A","B"],"rows":[["1","2"]]},"children":[]}}

// ❌ Unclosed — missing final }
{"op":"add","path":"/elements/table","value":{"type":"Table","props":{"columns":["A"],"rows":[]},"children":[]}
```

### 2.4 No HTML entities in plain text fields

UI spec text fields are plain text, not HTML.
Never use `&amp;`, `&#039;`, `&lt;`, `&gt;`, `&quot;` in `text`, `message`, `title`,
`description`, or `label` values.

```jsonc
// ✅
{"op":"add","path":"/state/msg","value":"Vendor 'Acme' is blocked."}

// ❌
{"op":"add","path":"/state/msg","value":"Vendor &#039;Acme&#039; is blocked."}
```

### 2.5 Array state — use pre-populated arrays or the `-` append token

```jsonc
// ✅ Option A — initialize with full array
{"op":"add","path":"/state/items","value":[
  {"id":"1","label":"First"},
  {"id":"2","label":"Second"}
]}

// ✅ Option B — append with RFC 6902 `-` token
{"op":"add","path":"/state/items","value":[]}
{"op":"add","path":"/state/items/-","value":{"id":"1","label":"First"}}
{"op":"add","path":"/state/items/-","value":{"id":"2","label":"Second"}}

// ❌ Index-based append on empty array — invalid RFC 6902
{"op":"add","path":"/state/items","value":[]}
{"op":"add","path":"/state/items/0","value":{"id":"1","label":"First"}}
```

### 2.6 `$state` binding format

State references must use the `$state` key with a fully-qualified path starting with `/`:

```jsonc
// ✅
{"type":"Badge","props":{"text":{"$state":"/invoice/status"},"variant":"default"},"children":[]}

// ❌ — wrong key name
{"type":"Badge","props":{"text":{"$ref":"/invoice/status"},"variant":"default"},"children":[]}
```

---

## 3. Tool Response — don't paraphrase, don't re-render

After a tool returns structured data:
- Display the tool's widget output (if `@Widget` is declared on the tool — the host renders it automatically).
- Add a one-sentence plain-text summary only if the widget is not available.
- Do **not** re-render the same data as a separate JSON spec block if the widget already handles it.

---

## 4. STP Rate — only one correct source

The Straight-Through Processing (STP) rate is calculated from the `invoices` table in SQLite.
The **only** correct tool to retrieve it is `get_invoice_analytics`.

- ❌ Do NOT use system health checks as a proxy for STP.
- ❌ Do NOT fabricate an STP percentage.
- ✅ Call `get_invoice_analytics({ filters: { dateFrom: "YYYY-MM-DD", dateTo: "YYYY-MM-DD" } })` and read `stpRate` from the response.

---

## 5. Compliance BLOCKED — routing

When `execute_workflow` returns `complianceResult.status === "BLOCKED"`:
- Status field will be `"exception"`
- The invoice-result widget renders a red 🚫 BLOCKED card automatically
- Do NOT display this as a `"warning"` — it is a hard block, not a soft flag
- Do NOT add "Approve & Release" buttons — BLOCKED invoices require legal_team review
- Summary text is pre-populated by `buildSummary()` in the backend — do not rewrite it
