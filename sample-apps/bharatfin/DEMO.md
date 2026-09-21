# BharatFin — Judge Demo Script

## Setup (read this first — widgets break without it)

1. `npm run dev`
2. Open NitroStack Studio, point it at this project path, confirm **Status: Connected**.
3. Ask for the dashboard once before judges arrive, to warm it up.

**Three things that silently break the widgets:**

- **Port.** `nitrostack dev` always *prints* "3001" but silently falls back to 3002/3003
  if that port is taken — while the server always *looks* for widgets on the port in
  `.env` (`WIDGETS_DEV_PORT`). Mismatch = blank widget. Check the real port with:
  `ps aux | grep "next dev"` and look at the last `--port`.
- **`.env` must exist.** It's gitignored, so a fresh clone has none. Copy the
  `WIDGETS_DEV_MODE` / `WIDGETS_DEV_PORT` lines from `.env.example` notes.
- **Never run `npm run build` while `npm run dev` is running.** It corrupts the build
  and wipes `src/widgets/out/`. Stop dev first, then build, then restart dev.

**Cosmetic:** Studio also renders its own generative-UI `spec` block under the widget.
It's harmless duplication — the real widget appears *above* it. If it looks noisy on the
projector, turn it off in **Customize → Render**.

**Demo persona:** Rajesh Kumar (`user_001`), applying jointly with Priya Singh (`user_002`)
on application `app_001` at SBI.

---

## The consent-enforcement flow (NEW — lead with this)

This is the sequence a bank judge recognises, because it mirrors real AA:
**Request → Pending → Blocked → Approved → Data released.**

### A. The bank raises a consent request
> "Raise a consent request for application app_001 at axis."

`request_customer_consent` — fires an AA request to **both** applicants with FI scope
(DEPOSIT + LOAN), purpose code 102, 90-day life. Returns `dataAccessible: false`.

### B. Prove the gate is real — try to take the data anyway
> "Fetch account data for acc_002."

Returns **`CONSENT_PENDING`**, `dataReleased: false`, and **no financial fields at all**.

> *"This is the part that matters. The consent check isn't a separate advisory tool you
> can skip — the gate lives inside the data tool. There is no code path that returns
> Rajesh's HDFC balance without his approval."*

### C. Partial release — consent is per-institution
> "Show me the dashboard for user_001."

The widget shows **SBI released, HDFC withheld** with an amber consent banner.

> *"Consent under AA is granted institution by institution. He approved SBI, not HDFC —
> so we show SBI and withhold HDFC. Not all-or-nothing. Exactly what he agreed to."*

### D. Customer approves in their AA app
> "Approve consent for user_001 at hdfc."

### E. Data now flows
> "Show me the dashboard for user_001 again."

Both accounts appear, banner gone.

### F. The regulator's evidence trail
> "Show me the consent audit log."

Every request, approval, and **refused** access attempt — with reasons.

> *"Banks don't just need the data. They need to prove to their risk committee and to
> the regulator that they never touched data they weren't entitled to. Every refusal is
> logged, not just every success."*

**Other failure modes you can show on demand:**
- `fetch_liabilities_bureau` for `user_003` → `CONSENT_MISSING` (no consent exists)
- A DEPOSIT-only consent asked for LOAN data → `SCOPE_VIOLATION`
- An expired consent → `CONSENT_EXPIRED`

---

## The 5-step chat flow

Type these into the Studio chat one at a time. Let the AI chain the tools itself —
don't call tools manually, the point is showing it chains correctly.

### 1. Discover + link
> "What banks can I link, and link SBI for user_001."

Expect: `list_supported_banks` → `link_bank_account`.
Talking point: *"This is the RBI Account Aggregator flow — in production this consent
URL is issued by Setu; here it's mocked."*

### 2. The consent gate — THE MONEY SHOT
> "Check the consent status for application app_001."

Expect: `check_consent_status` returns `allPartiesConsented: false` with
`blockedReason: "Awaiting consent from 1 of 2 applicant(s): Rajesh Kumar (primary)"`.

Talking point: *"This is a **joint** application. Priya has consented; Rajesh has an
approved SBI consent but a pending HDFC one. One incomplete applicant blocks the whole
application — we do not pull a single byte of financial data until every party has
consented. That's not a boolean we flipped, it's per-applicant gating."*

This is your novel differentiator. Linger here.

### 3. Fetch the data
> "Show me the dashboard for user_001."

Expect: `get_customer_dashboard` → renders the **customer-dashboard widget** with two
linked accounts and the credit-health card.

### 4. Liabilities
> "What are user_001's existing liabilities and credit score?"

Expect: `fetch_liabilities_bureau` — ₹21.5L outstanding across HDFC personal + ICICI home
loan, CIBIL 745.
Talking point: *"Bureau data is mocked; in production this is a CIBIL pull."*

### 5. Serviceability
> "Rajesh earns ₹1,00,000/month and declares ₹35,000 expenses. Can he service a ₹5,00,000 loan?"

Expect: `run_serviceability_calc` → effective expense ₹40,000 (the 40%-of-income floor
overrides his declared ₹35,000), disposable ₹60,000, eligible ₹36,00,000, qualifies: true.

Talking point: *"We don't trust the declared expense. We apply a 40%-of-income floor —
that's the conservative underwriting assumption."*

---

## Optional encore: the underwriter side

> "Show me exception applications for hdfc."

Expect: `authority_list_applications` → **authority-dashboard widget**, showing Priya's
app_002 flagged with 1 variance.

> "Show me the detail for app_002."

Expect: `authority_get_application_detail` — a 24% variance between declared ₹50,000 and
verified ₹62,000 expenses.
Talking point: *"The AA data contradicted the declared figure by 24%, so it auto-routed to
a human underwriter instead of silently approving or rejecting."*

> "Approve app_002, note that income was verified via AA."

Expect: `authority_review_exception` — status flips to approved. Re-running the detail
tool shows the persisted decision.

---

## If judges probe

- **"Is this real bank data?"** — No. Mock AA + bureau data, deliberately. The tool
  boundaries are real MCP tools; swapping the mock for Setu/Finvu is a client call inside
  each tool (the `TODO` comments mark the exact seams).
- **"What about auth?"** — Not implemented; out of scope for the hackathon build.
- **"Statement upload fallback?"** — Designed, not built.

## Known state

- 14 MCP tools registered, all verified working (24/24 test cases including error paths).
- 3 widgets wired: customer-dashboard, authority-dashboard, calculator-result.
- `calculate` / `convert_temperature` are leftover scaffold tools from the template —
  harmless, but don't showcase them.
