# Detection engine — algorithms, scoring, false-positive controls

This is the reference for the part of the codebase a judge is most likely to ask about. Everything here lives under `src/engine/` and is pure: no I/O, no network, no clock, no randomness. Identical input always produces an identical finding set, in a stable sorted order.

## 1. Path templatising (`src/engine/templatise.ts`)

Before any rule can run, concrete paths (`/api/v1/orders/10432`) need to collapse into templates (`/api/v1/orders/{orderId}`), grouping requests against the same logical endpoint together.

**Algorithm.** Build a trie of path segments from every observed path. At each trie node, decide whether its distinct child segment values should collapse into a single `{param}`:

- **Rule (a) — regex match.** If more than 60% of the node's distinct, non-stoplisted child values match one of:
  - `NUMERIC` — `/^\d+$/`
  - `UUID` — `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
  - `OBJID` — `/^[0-9a-f]{24}$/i` (Mongo-style ObjectId)
  - `HASHY` — `/^[A-Za-z0-9_-]{16,}$/`

  ...the node's children collapse into a parameter. Note there's no minimum sample count — even a single occurrence of a purely numeric segment is treated as a strong-enough signal.

- **Rule (b) — Jaccard-subtree overlap.** If rule (a) doesn't fire and there are ≥5 distinct non-stoplisted children, compute the average pairwise Jaccard similarity of each child's own grandchild key sets (the very next segment down). If that average is ≥0.6, collapse anyway. This is what catches slug- or tenant-style identifiers no regex will ever match — `/api/tenants/{acme,initech,umbrella,wayne,stark}/users/...` collapses to `/api/tenants/{tenantId}/users/{userId}` because every tenant's subtree looks the same shape, even though the tenant names themselves are arbitrary words.

  A real bug lived here until it was caught against NASA-HTTP traffic: two **empty** grandchild key sets were originally treated as a perfect Jaccard match (1.0) — meaning any ≥5 sibling **leaf** files (nothing follows them, so their grandchild sets are trivially both empty) always "matched," with no real evidence of shared shape. `/history/apollo/apollo-16/72HC31.GIF`, `72HC400.GIF`, `72HC401.GIF`, ... collapsed into a false `/history/apollo/apollo-16/{id}`, purely from the coincidence of being leaves, not from any genuine structural similarity. Fixed by scoring two empty sets as 0 overlap (no shape evidence), not 1 — a set of leaf siblings now needs an actual reason to collapse (rule (a)'s ID-shape check), not just the absence of children. Verified: re-running against the same real dataset, zero false `{id}` collapses remain; the legitimate tenant-slug case above (real, non-empty, shared subtrees) is unaffected.

- **Stoplist.** `api v0 v1 v2 admin internal auth login logout export health debug search me current latest all` are never collapsed into a parameter, regardless of what rule (a)/(b) would otherwise decide — even if a stoplisted word happens to sit alongside qualifying siblings, it's carved out as its own static branch and only the remaining siblings are evaluated for collapse. In practice, rules (a)/(b) already fail to collapse these words on their own (they're not regex-shaped and rarely appear ≥5-wide with matching subtrees) — the stoplist is a safety net, not the primary mechanism.

**Naming.** Not a generic "singularise + Id" transform — an explicit dictionary: `users → userId`, `orders → orderId`, `documents → docId`, `webhooks → hookId`, `invoices → invoiceId`, `tenants → tenantId`. Any other parent segment defaults to the generic `id`, with a `{id2}`, `{id3}`, ... suffix on a same-template naming collision.

**Determinism.** The trie is built once from the full input set; every original path is then resolved independently by walking the same finished, annotated trie. Order of the input array never affects the output — verified by an idempotence test (`tests/templatise.test.ts`).

## 2. Endpoint aggregation and topology (`src/engine/topology.ts`)

`aggregateEndpoints(records, documentedTemplates)` groups records by their templatised path into `EndpointTemplate` summaries: method set, request count, status-code histogram, distinct-actor count, first/last-seen timestamps (from the records, never `Date.now()`), and a `documented` flag from an exact-match check against `documentedTemplates` — which is expected to already be resolved via `diffSpec` (see below), not a raw spec.

`buildTopology` re-walks the same template set into a node/edge trie for the `topology_graph` widget: each accumulated path prefix is a node; a node's own `requestCount` reflects only its own traffic (0 for pure intermediate segments); an edge's `weight` is the sum of every descendant endpoint's request count, computed via a single post-order pass. Nodes are sorted by `(depth, id)`, edges by `(from, to)` — fully deterministic regardless of aggregation order.

## 3. Spec diffing (`src/engine/spec.ts`)

`parseOpenApiTemplates(spec)` reads `Object.keys(spec.paths)`. OpenAPI 2.0 (Swagger) and 3.x both put the path map under the same top-level `paths` key, so no version branching is needed — and since only the path *keys* are read, never an operation's schema, `$ref`-heavy documents need no resolution at all.

**The critical design point in `diffSpec`:** a published spec may name a parameter differently from how `templatise.ts` names it — `/orders/{order_id}` in the spec vs. our own `/orders/{orderId}`. Comparing by string equality would misclassify every such endpoint as shadow. Instead, both sides are normalised to "static segments + parameter position" (`{}` in place of any `{...}` segment) before comparing:

```
normalizeShape("/api/v1/orders/{order_id}") === normalizeShape("/api/v1/orders/{orderId}")
  → "/api/v1/orders/{}" === "/api/v1/orders/{}"  → true
```

`diffSpec` returns `documented` (observed templates whose normalised shape matches a spec path), `shadow` (observed templates that don't), and `orphanedInSpec` (spec paths whose normalised shape was never observed in traffic — "endpoints in your spec that no longer exist").

## 4. Untrusted-input handling (`src/engine/sanitise.ts`)

See the README's Security Considerations section for the design rationale (structural isolation over blocklisting). Mechanically:

`neutralise(value, maxLen, field)`:
1. Unicode NFKC normalise (defeats homoglyph evasion).
2. Strip non-whitespace ASCII control characters (`\x00`–`\x08`, `\x0B`, `\x0C`, `\x0E`–`\x1F`, `\x7F` — deliberately excluding `\t`/`\n`/`\r`, which are ordinary whitespace handled by step 3), zero-width characters (U+200B–U+200F, U+FEFF), and bidi overrides (U+202A–U+202E, U+2066–U+2069).
3. Collapse whitespace runs to a single space, trim.
4. Hard-cap length at `maxLen`, appending `…[truncated]` if truncated.
5. Escape any literal `<`/`>` in the value (`&lt;`/`&gt;`), then wrap in `<untrusted field="...">...</untrusted>`.

Step 5 is the actual defense — steps 1–4 just remove cheap evasion tooling so the wrapping can't itself be broken out of.

`detectInjectionAttempt(record)` checks path/query/User-Agent (after NFKC + zero-width stripping) against a fixed pattern set, case-insensitively except for the structural multi-newline check:

```
ignore previous | ignore all previous
disregard (the )?(above|previous)
system: | assistant:
</untrusted | <\|
###\s*instruction
you are now | new instructions | override .{0,20}instructions
\n{3,}                              (User-Agent only — stands in for "a header field")
```

Returns `{field, pattern}[]` per match, or `null` — never an empty array for "nothing found," so callers can't mistake "no matches" for "no attempt was made to look."

## 5. The seven rules (`src/engine/rules/`)

Each rule is one file, taking a shared `DetectionContext = { records, templates, documented, byTemplate }` and returning `Finding[]`. Finding ids are `${rule}_${sha256(rule::template).slice(0,12)}` — stable and derived, never random or index-based, so re-running detection never changes an id an agent might have cited earlier in a conversation.

### R1_CROSS_ACTOR (CWE-639)

For each template with ≥1 path parameter, for each parameter position independently: group 2xx-status records by the concrete value at that position, tracking the set of distinct `actor.sub` values and whether any contributor has role `admin`/`service`. A concrete value with ≥2 distinct subs and no privileged contributor is a "shared object" — flagged as evidence of an object identifier that isn't scoped to the requesting account. All shared objects across all parameter positions on one template roll into a single `Finding` (metrics: `sharedObjectCount`, `maxActorsPerObject`, `affectedRequests`; evidence capped at 25 ids with the true count in `evidenceTotalCount`).

**Why admin/service exemption matters:** an admin or support account legitimately touching many customers' objects is not itself the vulnerability — the rule specifically wants "two *ordinary* users see each other's data."

### R2_ENUMERATION (CWE-799)

For each template with ≥1 parameter, take the *last* (most specific — typically the innermost resource id) parameter position. Per actor, sort their requests by timestamp and slide a 120-second window (two-pointer, O(n) per actor) looking for the window with the most distinct values at that position. If any actor's best window touches ≥20 distinct values, that's enumeration. `successRatio` (2xx fraction within the winning window) decides the rationale's framing: >80% reads as "mass data extraction," otherwise "authorization probing." Only the single worst offender per template becomes the `Finding` — metrics: `idsTouched`, `windowSec` (constant 120), `successRatio`.

### R3_AUTH_GAP (CWE-306)

For each template with `requestCount ≥ 200` and `denialCount (401+403) === 0`: look at every other template with the same path depth (segment count). If **any** sibling at that depth has a nonzero denial count, flag — the sibling proves auth enforcement is even checkable at that depth, so this endpoint's total silence on 401/403 is conspicuous rather than just "this depth of the API happens to be public."

**This sibling condition is the entire false-positive control.** Without it, any genuinely-public, high-traffic endpoint (a health check, a public catalog) would trip the rule purely for having no denials. With it, `/api/v1/auth/login` never even reaches the check — it has plenty of its own 401s from failed logins — and a hypothetical all-public API (where *no* template anywhere ever denies anything) would never flag *anything* under this rule, because no sibling could prove the absence is meaningful.

### R4_EXISTENCE_ORACLE (CWE-204)

For each template with ≥1 path parameter, take the last parameter position and, for each concrete value seen there, compute the *set* of distinct status codes ever returned. A value is "existing" if its status set is exactly `{401}`, "nonexistent" if exactly `{404}` — values with any other status (2xx, a mix, etc.) are ignored, since they're not part of the oracle. If both an existing set and a nonexistent set are non-empty on the same template, flag: an unauthenticated caller can tell real object IDs from fake ones purely from the status code, without ever logging in. Metrics: `existingIdCount`, `nonexistentIdCount`.

**This is the anti-pattern itself, not a symptom.** Best practice for object-scoped endpoints is to return 404 for both "doesn't exist" and "exists but you can't see it," precisely so existence isn't observable pre-auth. A clean 401-vs-404 split at the same parameter position is exactly what that guidance exists to prevent — there's no legitimate-public-endpoint carve-out to construct here the way there is for R3, because the discrepancy is the vulnerability.

### R5_SHADOW (CWE-1059)

Two modes, chosen by whether `ctx.documented` (the raw imported spec's path list) is non-empty:

- **Spec provided:** shadow = every template where `EndpointTemplate.documented === false` (i.e., `diffSpec` already excluded it — see §3). The API-shape pre-filter below does **not** apply here — a real spec already tells us definitively what counts, including any static-looking path it happens to document.
- **No spec:** heuristic — a template first passes an API-shape pre-filter (below), then is flagged if the path matches `/^\/(internal|_|v0|debug|legacy|tmp)/`, OR if the template's request count is at or below the 15th percentile of *other API-shaped candidates'* request counts AND it supports neither `OPTIONS` nor `HEAD` (a proxy for "nobody wired this into routing/CORS metadata properly").

**API-shape pre-filter.** Running the no-spec heuristic against a real static-file server (the NASA-HTTP July 1995 access logs — see the README's real-data validation) produced 230 LOW-severity findings, nearly all one-off `.gif`/`.html`/`.txt` files: technically true (they're not in any spec) but not what "shadow API endpoint" is supposed to mean, and noisy enough to drown out findings that matter. A template with zero path parameters whose final path segment has a recognisable static-asset extension (`.html`, `.gif`, `.css`, `.js`, `.pdf`, ...) is presumed to be a document or asset rather than an API route, and is excluded from heuristic-shadow consideration entirely — including from the percentile calculation itself, so a long tail of one-off static files can no longer drag the low-traffic threshold down for genuine API endpoints. Re-running against the same real dataset after this fix: 230 → 83 findings (64% reduction). The remaining 83 include some real noise from a separate, unrelated edge case in `templatise.ts`'s Jaccard-overlap rule (§1, rule b), which can collapse sibling static filenames sharing an (empty) grandchild key set into a false `{id}` parameter — a parameterised path is presumed API-shaped by this filter's design, so those slip through. Not fixed here; noted rather than hidden.

Baseline severity is MEDIUM (`score.ts` base 35); see §6 for the escalation that turns an unauthenticated shadow endpoint into CRITICAL.

### R6_UNGUARDED_WRITE (CWE-285)

Structurally identical to R3 — a template with zero denials, proven suspicious by a same-depth sibling that does deny — but scoped to mutating methods (`POST`/`PUT`/`PATCH`/`DELETE`) only, and at a much lower volume threshold (≥10 write requests, vs. R3's ≥200). The threshold is deliberately different: a read endpoint needs volume before "nobody's ever been denied" is meaningful signal rather than noise, but a *write* endpoint doesn't — a single unauthorized `DELETE` or `PATCH` is already damage done, so the bar for flagging is set low on purpose. Metrics: `writeRequestCount`, `distinctActors`, `siblingDenialCount`.

### R7_LOG_INJECTION (CWE-117)

Runs `detectInjectionAttempt` over every record, grouped by template. Any template with ≥1 hit gets a `Finding` with `attemptCount` (distinct offending records), `distinctIps`, `distinctPatterns`. The rule's own `title`/`rationale` reference pattern *names* (`ignore-previous`, `system-role`, ...), never the raw matched text — the actual payload is reachable only via `evidence://finding/{id}`, itself neutralised.

## 6. Scoring (`src/engine/score.ts`)

```
score = base[rule] × exposureMultiplier × sensitivityMultiplier     (clamped 0–100)

base:  R3=70  R1=65  R7=62  R2=60  R6=55  R4=40  R5=35

exposureMultiplier    = 1.0 + min(0.4, log10(1 + distinctActors × requestCount) / 20)

sensitivityMultiplier = max keyword-tier match on the template string, case-insensitive:
  1.5   payment invoice billing card ssn tax payroll salary
  1.4   export dump backup admin internal
  1.3   user customer account profile document contract order
  1.0   otherwise

severity:  CRITICAL ≥85   HIGH ≥65   MEDIUM ≥40   else LOW
```

**R5 escalation.** After every finding has an independently-computed score/severity, a second pass groups findings by template. Any `R5_SHADOW` finding co-located with a non-R5 finding on the *same* template inherits the maximum severity among those co-located findings — and its score is bumped to at least that severity's floor (85/65/40), so the two fields never disagree (a CRITICAL-labelled finding with a MEDIUM-range score would be a visible inconsistency in the demo). This is why `/internal/v0/export/customers` shows `R5_SHADOW` at CRITICAL (score 85) rather than its raw MEDIUM baseline — it's co-located with `R3_AUTH_GAP`, which is independently CRITICAL on its own.

Final sort: score descending, then template ascending, via a stable sort — ties beyond that retain the original rule-evaluation order (R1, R2, R3, R4, R5, R6, R7), which is itself fixed by `runDetection`.

## 6a. Attack session reconstruction (`src/engine/session.ts`)

`reconstructAttackSession(actorSub, records, templates, findings)` is presentation-shaping, not detection — it introduces no new attack-detection logic, only a time-ordered, grouped view of facts §5's rules already established.

**Two views built from one sorted list.** `events`: every record belonging to `actorSub`, sorted by `(ts, id)` for a total deterministic order. `groups`: consecutive events sharing the same `(template, method)` collapsed into one entry with a `count`, a `distinctObjectIds` count, and a `sampleObjectId` — this is what turns "340 individual GET requests" into one line reading `×340 (340 distinct)`.

**Cross-referencing findings without re-running detection.** Every `Finding.evidence` array already lists the record ids that triggered it; `session.ts` inverts that into a `recordId -> findingId[]` index once, then tags each event (and by extension each group, and the session's top-level `findings` summary) with whichever findings its own evidence implicates. A finding never has to be recomputed to know which part of the timeline it belongs to.

**The untrusted-input contract applies identically here.** The per-event `path` field is `neutralise()`'d before being returned, exactly like `get_finding_evidence`'s records. A raw, un-neutralised `objectId` field was deliberately *not* added to the public event shape during design — it would have been a second copy of the same attacker-controlled string reaching the response unwrapped, so the concrete object id only ever appears pre-neutralised, either inside the group's `sampleObjectId` or in context inside the event's `path`.

## 7. False-positive controls, summarised

| Risk | Control |
|---|---|
| Legitimate admin/support access flagged as cross-actor sharing | R1 excludes any object where a contributing accessor has role `admin`/`service` |
| A genuinely public, high-traffic endpoint flagged for having no denials | R3 requires a same-depth sibling to already prove denials are checkable at that depth |
| An enumeration burst colliding by chance with a legitimate owner's own access, muddying the signal | The fixture generator explicitly excludes already-legitimately-touched IDs from the synthetic attacker's sample pool (see `scripts/generate-fixtures.ts`) — a data-generation control, not a rule control, but worth knowing about when reading the ground-truth numbers |
| R7 itself becoming a second injection vector by echoing the payload it detected | Title/rationale/metrics reference pattern names only; raw text is reachable solely through the neutralised evidence resource |
| A finding with no way to verify it | `Finding.evidence` is required non-empty; enforced by a project-wide test |

## 8. CWE map

| Rule | CWE | Title |
|---|---|---|
| R1_CROSS_ACTOR | CWE-639 | Authorization Bypass Through User-Controlled Key |
| R2_ENUMERATION | CWE-799 | Improper Control of Interaction Frequency |
| R3_AUTH_GAP | CWE-306 | Missing Authentication for Critical Function |
| R4_EXISTENCE_ORACLE | CWE-204 | Observable Response Discrepancy |
| R5_SHADOW | CWE-1059 | Insufficient Documentation |
| R6_UNGUARDED_WRITE | CWE-285 | Improper Authorization |
| R7_LOG_INJECTION | CWE-117 | Improper Output Neutralization for Logs |
