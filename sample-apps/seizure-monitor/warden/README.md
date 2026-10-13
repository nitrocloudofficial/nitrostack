\# WARDEN



\*\*WARDEN doesn't tell you what's broken. It hands you the patch, proves it worked — and assumes every report it reads is trying to trick it.\*\*



A threat-intelligence MCP server built on the NitroStack CLI framework. It scans a dependency manifest against

\[OSV.dev](https://osv.dev), ranks what it finds by real-world exploitation evidence (CISA KEV + FIRST EPSS)

instead of raw CVSS severity, generates an actual patch — rewritten manifest, unified diff, PR description —

and re-verifies the fix against OSV before trusting it. Separately, it reads threat-intel reports from

untrusted URLs and quarantines any prompt-injection attempt server-side before the content ever reaches a model.

Every tool call and every explicit decision is written to an auditable investigation trace.



This is v2 — a full migration off the hand-rolled MCP stdio server v1 shipped with (no npm registry access in

that build environment) onto the real `@nitrostack/core` decorator framework, plus the remediation pipeline

that replaced v1's read-only CVE lookup.



\## Tools, resources, prompt



| Primitive | Name | Module | What it does |

|---|---|---|---|

| Tool | `scan\_manifest` | `remediation` | Batch-queries OSV.dev against a `package.json` (npm), `requirements.txt` (PyPI), or `go.mod` (Go) manifest's declared dependencies |

| Tool | `prioritise\_findings` 🖼️ | `remediation` | Ranks findings by CISA KEV + FIRST EPSS, not CVSS |

| Tool | `plan\_remediation` | `remediation` | Computes the minimum version that clears every finding, then re-verifies and escalates further if that target itself carries independent vulnerabilities; flags major-version (breaking) bumps |

| Tool | `generate\_patch` | `remediation` | Rewrites a `package.json`, produces a unified diff and PR body — the actual deliverable |

| Tool | `verify\_fix` | `remediation` | Re-queries OSV against the \*proposed\* versions to confirm the patch worked |

| Tool | `triage\_finding` | `triage` | Routes a finding to safe auto-fix, reviewed fix, human review, operations, or no-fix-yet; anything non-`auto\_fix` is written to the needs-human queue |

| Tool | `suggest\_mitigation` | `mitigation` | Suggests compensating controls (WAF rule, feature flag, network restriction) for a finding with no fix yet |

| Tool | `scan\_website` | `webscan` | Checks a live URL's HTTP security headers, common exposed-file paths (`.env`, `.git`, credential backups), and TLS certificate |

| Tool | `fingerprint\_technology` | `webscan` | Detects CMS/framework/server/library identity + version from headers and markup; CVE-matches via OSV where a real ecosystem mapping exists |

| Tool | `scan\_html\_vulnerabilities` | `webscan` | Regex-scans raw HTML for hardcoded secrets, DOM XSS sinks, mixed content, reverse tabnabbing, insecure password-form submission, missing SRI, sensitive comments, and inline event handlers — accepts a live `url` or raw `html` directly |

| Tool | `check\_domain\_security` | `dnscheck` | Checks SPF/DMARC/DKIM email-spoofing defenses via DNS TXT lookups (Node's `dns` module, no API key) |

| Tool | `ingest\_finding` | `findings` | Accepts one finding from any scanner — WARDEN's own or an external MCP scanner's output — auto-classifies, scores, and persists it (MongoDB) |

| Tool | `query\_findings` | `findings` | Lists persisted findings, filterable/sortable by class, priority, complexity, fixability, status |

| Tool | `analyze\_finding\_history` | `findings` | Recurrence check: occurrence count, first/last seen, full event timeline for a given finding |

| Tool | `read\_threat\_report` ★ 🖼️ | `report` | Reads a URL, quarantines any prompt-injection attempt server-side, returns only extracted facts |

| Tool | `note\_decision` | `investigation` | Records a reasoning step to the current investigation's audit trail |

| Resource | `cti://investigations` | `investigation` | Every investigation this server has traced, most recent first |

| Resource | `cti://investigation/{id}` | `investigation` | Full audit trail for one investigation — every tool call and decision, in order |

| Resource | `cti://queue/needs-human` | `investigation` | Every finding `triage\_finding` routed to a human-owned queue — in-memory, process-lifetime only (see `findings` table for the durable version) |

| Prompt | `investigate\_threat` | `investigation` | Starts an investigation and returns the analyst methodology WARDEN expects the agent to follow |



🖼️ = has a linked widget (see "Widgets" below); `prioritise\_findings` also carries one.



Use `triage\_finding` after detection to decide whether WARDEN may generate a remediation artifact. It is a policy-only router: secret rotation, incident containment, legal decisions, and first-party logic changes stay human-owned. A missing patch is explicitly returned as `no\_fix\_yet`, and every route other than `auto\_fix` is persisted to `cti://queue/needs-human` so it survives past the single tool call. `suggest\_mitigation` is the companion for `no\_fix\_yet` findings — a fixed, reviewable set of compensating controls, never an automatic action.



The remediation pipeline is meant to be called in order: `scan\_manifest` → `prioritise\_findings` →

`plan\_remediation` → `generate\_patch` → `verify\_fix`. Each tool's output is shaped to be passed straight into

the next one's input (`findings` → `findings` → `plan` → `plan`). `generate\_patch` and `verify\_fix` currently

patch/re-verify `package.json` (npm) only — `scan\_manifest`/`prioritise\_findings`/`plan\_remediation` support all

three ecosystems, but text-editing `requirements.txt`/`go.mod` in place is not yet implemented.



\*\*`plan\_remediation`'s target versions are self-correcting\*\* (`src/modules/remediation/escalate-target.ts`):

the "minimum fix" for a package's originally-scanned CVEs can still land on a version that carries its own,

unrelated vulnerabilities — this bit us for real with `axios` (bumping 0.21.0 → 0.21.2 clears the scanned SSRF

CVE, but 0.21.2 itself still had \~24 independent open CVEs, because the whole 0.21.x line predates axios's

rewrite). `plan\_remediation` now re-queries OSV against its own proposed target and escalates further

(capped at 5 rounds) until that target is actually clean — for the axios case this correctly jumps to the 1.x

line and flags it `breaking: true`, rather than silently recommending a still-vulnerable "fix." Each plan entry

reports `escalations` (how many extra rounds it took) and `escalation\_notes` (why). `verify\_fix` still exists

as an independent second check afterward — this doesn't replace it, it just means the plan itself is no longer

naive going in.



`scan\_website` is a separate, standalone check — point it at any `http(s)://` URL and it returns a `risk\_level`

plus per-check findings. It never brute-forces directories and never mutates the target; every request is a

single read-only GET/HEAD or TLS handshake.



`fingerprint\_technology` (`src/modules/webscan/fingerprint.ts`) pattern-matches headers and markup against a

signature list (WordPress, Drupal, Joomla, Shopify, Magento, Next.js, Express, ASP.NET, jQuery, Bootstrap, PHP,

Apache, nginx). \*\*Honest limitation:\*\* OSV.dev has no ecosystem for WordPress core, PHP, Apache, or nginx (see

`curl https://osv-vulnerabilities.storage.googleapis.com/ecosystems.txt`) — CVE-matching only runs for the

subset with a real mapping (npm for JS libraries, Packagist for Drupal core). For everything else, the tool

reports the detected name/version and says explicitly that no CVE check was possible, rather than implying a

clean result that never ran.



`scan\_html\_vulnerabilities` (`src/modules/webscan/html-vuln-rules.ts`) is a separate check from `scan\_website` —

it looks at the page \*body\* rather than headers/TLS. It accepts either a live `url` (fetched with redirects

followed) or raw `html` pasted/loaded directly, so a saved fixture can be scanned with no network request at

all. Secret matches (AWS/Google/Stripe/Slack keys, private-key blocks) are always masked in the finding — only

enough of the match is kept to prove it's real, never the full value. Like the rest of webscan, it's plain

regex over markup, not a headless-browser or exploitation check — a DOM-sink match means "innerHTML is fed by a

URL/referrer read in the same script block," not "this is a proven, exploitable XSS."



`check\_domain\_security` (`src/modules/dnscheck/`) checks SPF (root domain TXT), DMARC (`\_dmarc.<domain>` TXT),

and DKIM (a curated list of common provider selectors — DKIM selectors aren't discoverable via DNS, so a miss

is inconclusive, not confirmed absence) via Node's built-in `dns.promises.resolveTxt`. It also distinguishes a

genuine "no such record" (`ENOTFOUND`/`ENODATA`) from a failed lookup (`ECONNREFUSED`/timeout/etc.) — the latter

sets `lookup\_failed: true` and is excluded from the risk verdict, so a blocked or offline resolver can never be

mistaken for "this domain has no SPF."



`read\_threat\_report`'s injection scanner (`src/modules/report/injection-scanner.ts`) catches six categories:

imperative override, role hijack, exfiltration, hidden text (HTML comments / `display:none` / etc.), zero-width

steganography (`src/modules/report/zero-width.ts`), and tool hijack. `fixtures/poisoned-report.html` plants one

real example of each of the first three hiding mechanisms; `fixtures/clean-report.html` is the same article

with no injections, for a side-by-side demo. Both are served over HTTP by a small fixtures server

(`src/fixtures-server.ts`, port `8787` by default) alongside the MCP server itself.



\## Findings pipeline (`src/modules/findings/`, MongoDB Atlas-backed)



Every finding — from any of the scanners above, or `ingest\_finding`'d from an external MCP scanner server's

output — flows through: \*\*classify\*\* (`classify.ts`, 12-class taxonomy from `triage-rules.ts`) → \*\*score\*\*

(`priority-complexity.ts`, reuses `prioritise\_findings`' own CISA KEV + FIRST EPSS logic for priority, plus a

new `complexity` dimension: how much judgment the fix needs, not how severe it is) → \*\*persist\*\*

(`findings.service.ts`, deduplicated by package+CVE/indicator against the `findings` collection).



\- \*\*`findings` collection\*\* — current state of every finding: class, priority, complexity, `fixable`, `status`

&#x20; (`open`/`suggested`/`applied\_externally`/`resolved`/`dismissed`), description, suggested solution. Unique

&#x20; index on `dedupe\_key`; indexes on `finding\_class`, `status`, `priority`, `fixable`.

\- \*\*`finding\_events` collection\*\* — append-only audit log (`created`/`reoccurred`/etc.), indexed on

&#x20; `finding\_id` and `event\_type` — `analyze\_finding\_history` reads \*this\*, not `findings`, since only the event

&#x20; log can answer "has this happened before."

\- \*\*Fixable ≠ auto-applied.\*\* A fixable finding is persisted with `status: suggested` — the target version,

&#x20; diff, and PR body come from `generate\_patch` as they always have (that tool has never written to your actual

&#x20; files or run a package manager). Nothing in this pipeline ever flips a finding to `resolved` on its own.

\- \*\*`triage\_finding` now writes to both\*\* the old in-memory `cti://queue/needs-human` (backward-compatible,

&#x20; process-lifetime only) \*\*and\*\* the durable `findings` collection, for every route — not just non-`auto\_fix`

&#x20; ones. If MongoDB isn't configured, the persistence write fails gracefully (`persisted: false,

&#x20; persistence\_error: "..."`) rather than crashing the triage call itself.

\- \*\*Tool-availability downgrade\*\* (`src/modules/triage/tool-availability.ts`): pass `available\_tools` to

&#x20; `triage\_finding` and an `auto\_fix`-eligible finding (`vulnerable\_dependency`/`container\_image\_vulnerability`)

&#x20; without a reported patch-generation tool gets downgraded to `human\_review`. \*\*Honest limitation:\*\* MCP has no

&#x20; protocol-level way for WARDEN to see another server's connected tools — this only ever works off what the

&#x20; calling agent self-reports.

\- \*\*`classify.ts`'s per-source heuristics are best-effort\*\*, not a general classifier — an unrecognized

&#x20; `source` falls back to keyword matching, and if that's not confident either, `ingest\_finding` throws asking

&#x20; for `hint.finding\_class` rather than silently mis-filing the finding.



Setup: `npm install mongodb` (already in `package.json`), then set `MONGODB\_URI` in `.env` (Atlas connection

string, database name `warden`). \*\*Network Access note:\*\* the Atlas project's IP Access List is set to

`0.0.0.0/0` (allow from anywhere) — a deliberate choice for a PaaS deployment target with no fixed egress IP,

made explicitly rather than by default; the security boundary is the database user's credentials, same model

Supabase's RLS-scoped anon key used in the previous backend.



\*\*Use the non-SRV connection string, not `mongodb+srv://`.\*\* The SRV form requires a DNS SRV lookup on every

fresh connection; some restrictive network environments block SRV/TXT-record DNS queries while leaving normal

A-record resolution (and HTTPS) untouched — this project's own dev sandbox is one of them, discovered when

`MongoHealthCheck` reported `down` with `querySrv ECONNREFUSED` while every HTTP-based tool worked fine. The

fix is mechanical: resolve the three shard hostnames once (`dig`/`nslookup` the `\_mongodb.\_tcp.<cluster>` SRV

record, or read them from Atlas's "Connect" dialog) and build a direct `mongodb://host1,host2,host3/...`

string instead — same cluster, same credentials, just skips the SRV step. `.env` already uses this form.



`MongoHealthCheck` (`src/health/mongo.health.ts`) pings the connection every 30s and reports `up`/`down` —

this is what a NitroStudio-style health-check panel reads; without it, there was no way for anything outside

this server's own code to see whether MongoDB was actually reachable.



Originally built against Supabase/Postgres (see git history for that version's schema/RLS-policy approach);

migrated to MongoDB because NitroCloud's own managed-database integration currently only offers MongoDB.



\## Widgets



Two tools carry a linked `@Widget` (`src/widgets/app/`, Next.js + `@nitrostack/widgets`):



\- \*\*`priority-table`\*\* (on `prioritise\_findings`) — an expandable ranked table: package → highest priority badge

&#x20; → click to expand into per-CVE rows with priority, "IN CISA KEV"/"RANSOMWARE-LINKED" badges, and EPSS %.

\- \*\*`injection-report`\*\* (on `read\_threat\_report`) — a full-width banner: red "⚠ PROMPT INJECTION DETECTED — N

&#x20; ATTEMPT(S) QUARANTINED" with each quarantined excerpt when `injection\_detected` is true, green "✓ No injection

&#x20; attempts detected" otherwise, followed by the extracted-facts tag lists.



Both compile and `next build` cleanly as static pages (`src/widgets/app/priority-table/page.tsx`,

`.../injection-report/page.tsx`); `widget-manifest.json` carries real example payloads captured from a live run

against `fixtures/outdated-package.json` and `fixtures/poisoned-report.html`, not placeholder data. Test with

`npm --prefix src/widgets run dev` (port 3001) or open the project in NitroStudio.



\## Data sources — no API keys required



\- \*\*\[OSV.dev](https://osv.dev)\*\* — `POST /v1/querybatch` (up to 1000 package queries/request) and

&#x20; `GET /v1/vulns/{id}`. Aggregates GitHub Advisory DB, npm advisories, and others. Free, public, unauthenticated.

\- \*\*\[CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)\*\* — the confirmed-exploited-in-the-wild

&#x20; catalog. Loaded once at startup (`src/data/kev-loader.ts`); falls back to a small seed set if the live feed

&#x20; is unreachable so the ranking logic never has nothing to show.

\- \*\*\[FIRST EPSS](https://www.first.org/epss/)\*\* — predicted 30-day exploitation probability, batched by CVE.



\## Setup



```bash

npm install

npm run dev     # NitroStack dev server, hot reload, stdio transport

```



```bash

npm run build   # production bundle -> dist/

npm start       # NODE\_ENV=production -> dual transport: stdio AND http://localhost:3000/mcp

```



Optional environment variables:



\- `WARDEN\_FIXTURES\_PORT` — port for the static fixtures server (default `8787`). Deliberately not `PORT` —

&#x20; NitroStack's own HTTP transport binds that one in production/dual mode.

\- `WARDEN\_DISABLE\_FIXTURES\_SERVER=1` — MCP-only, no fixtures HTTP server.



\## Known limitations (stated up front, not discovered the hard way)



\- \*\*Manifest versions are declared-range approximations, not lockfile-resolved.\*\* `"^4.17.15"` is checked as

&#x20; `4.17.15` — the version actually installed by a real `npm install` could differ. Every tool that touches this

&#x20; says so in its own response `note` field.

\- \*\*`semver.ts` is a hand-rolled `major.minor.patch` comparator\*\*, not the full semver spec (no prerelease/build

&#x20; metadata precedence). Matches the same honesty budget as the point above.

\- \*\*OSV rarely exposes a plain numeric CVSS score\*\* — `severity\[].score` is usually a raw CVSS vector string.

&#x20; `prioritise\_findings` reports `cvss: null` far more often than v1 did against NVD. This is not a bug; it's the

&#x20; argument for ranking by KEV/EPSS evidence in the first place.

\- \*\*`generate\_patch`/`verify\_fix` are npm/`package.json`-scoped.\*\* `scan\_manifest` parses `requirements.txt` and

&#x20; `go.mod` too, but there is no in-place text-editing patch generator for those formats yet — only the scan step

&#x20; covers all three ecosystems.

\- \*\*`requirements.txt` parsing only resolves pinned (`==`) versions.\*\* A range like `>=1.4,<2.0` has no single

&#x20; concrete version to check against OSV without a resolved lockfile, so those lines are skipped, not guessed at.

\- \*\*`scan\_website`'s exposed-file check is a fixed list of common paths, not a directory brute-force\*\*, and a 200

&#x20; response is reported as "exposed" without inspecting the body — some servers return 200 with a catch-all page

&#x20; for every path, so treat a hit as a lead to confirm, not a certainty.

\- \*\*`fingerprint\_technology` only CVE-matches technologies with a real OSV.dev ecosystem mapping\*\* (JS libraries

&#x20; on npm, Drupal core on Packagist). OSV has no ecosystem for WordPress core, PHP, Apache, or nginx, so those are

&#x20; detected but not CVE-checked — the response says so explicitly per technology, it doesn't just omit them.

\- \*\*`check\_domain\_security`'s DKIM check is a curated list of common selectors, not a discovery mechanism\*\* — a

&#x20; DKIM public key's DNS name is chosen by whoever configured the domain and isn't announced anywhere; `any\_found:

&#x20; false` means "not found under these selectors," not "this domain has no DKIM." Separately, every check

&#x20; distinguishes a genuine missing record from a failed DNS lookup (`lookup\_failed: true`) — the latter is

&#x20; excluded from the risk verdict rather than reported as a finding.



\## Architecture note: why this isn't the hand-rolled server anymore



v1 shipped a dependency-free hand-rolled implementation of the MCP stdio wire protocol, because that build

environment had no npm registry access at all. This version is a real `nitrostack-cli init --template

typescript-starter` project using `@nitrostack/core`'s decorator framework (`@Tool`, `@Resource`, `@Prompt`,

`@Module`, `@Interceptor`/`@UseInterceptors`) — verified live, not just read: every tool/resource/prompt in the

table above has been round-tripped over real stdio JSON-RPC, and the remediation pipeline has been run

end-to-end against live OSV.dev/CISA KEV/FIRST EPSS data.



Two framework gotchas hit and fixed along the way, worth knowing if you extend this:



\- `@Resource` handlers must return `{type: 'text'|'json'|'binary', data}` (the `ResourceContent` union), not

&#x20; `{contents: \[...]}`. The starter template's own `calculator.resources.ts` example ships with the wrong shape

&#x20; too — it's just never exercised by the quickstart, so nobody hits it.

\- `InterceptorInterface.intercept(context, next)` has no access to the tool's raw input arguments — only

&#x20; `ExecutionContext` (tool name, request id, logger, auth, task). The auto-trace-logging interceptor

&#x20; (`investigation.interceptor.ts`) can log tool name + outcome automatically, but not a separate args summary —

&#x20; outcomes echo their own key inputs (e.g. `source\_url`) instead.



A harmless, cosmetic wart: an unconfigured `OAuthModule` logs an instantiation error

(`Cannot resolve token "OAUTH\_CONFIG"`) on every boot. The server starts and runs correctly regardless — this

app never imports or configures OAuth — but it hasn't been silenced yet.



\## What's NOT done yet



\- \*\*Deployment.\*\* NitroStack does offer a hosted platform (\*\*NitroCloud\*\*, `cloud.nitrostack.ai` — "serverless

&#x20; MCP hosting... deploy from GitHub in seconds"), but the documented flow (`nitrostack login` /

&#x20; `nitrostack deploy`) does not match the installed CLI: `@nitrostack/cli@1.0.15` (latest published) has no

&#x20; `login` or `deploy` command. It does have an undocumented `nitrostack-cli pack` (zips the project, excludes

&#x20; build artifacts) that's plausibly the upload artifact for a GitHub-connected or manual-upload flow, but

&#x20; that's inference, not confirmation. Concretely unverified: whether NitroCloud requires a GitHub App

&#x20; connection vs. direct `pack` upload, what config file (if any) it expects in the repo, how secrets/env vars

&#x20; are set, and what port/transport it expects (this app already produces a real HTTP endpoint in dual mode, so

&#x20; a plain container host would work regardless — see v1's README for the Docker deployment pattern confirmed

&#x20; from NitroStack's docs).

\- `requirements.txt` / `go.mod` \*\*patch generation\*\* — `scan\_manifest` now parses both (see the tools table

&#x20; above), but `generate\_patch`/`verify\_fix` remain npm/`package.json`-scoped.

\- \*\*The findings pipeline is a new external dependency.\*\* Until now this server was deliberately zero-dependency

&#x20; and stateless. `SUPABASE\_URL`/`SUPABASE\_ANON\_KEY` now need to be configured wherever WARDEN runs (including

&#x20; once NitroCloud deployment above is resolved) — everything else degrades gracefully if they're absent, but

&#x20; `ingest\_finding`/`query\_findings`/`analyze\_finding\_history` and `triage\_finding`'s persistence write need them.



\## Project layout



```

src/

&#x20; app.module.ts                  # root module — imports ReportModule, InvestigationModule, RemediationModule,

&#x20;                                 # TriageModule, WebscanModule, MitigationModule, DnscheckModule, FindingsModule

&#x20; index.ts                       # entrypoint — loads CISA KEV, starts the NitroStack app + fixtures server

&#x20; fixtures-server.ts             # tiny static server exposing fixtures/ at /fixtures/\*

&#x20; data/

&#x20;   cache.ts                     # generic TTL cache (EPSS scores)

&#x20;   kev-loader.ts                # CISA KEV feed -> in-memory index, loaded once at startup

&#x20;   mongo.client.ts               # lazy MongoDB client (MONGODB\_URI, database "warden")

&#x20; health/

&#x20;   system.health.ts             # NitroStack health check (memory/uptime)

&#x20;   mongo.health.ts               # pings MongoDB Atlas every 30s, reports up/down

&#x20; modules/

&#x20;   report/                      # ★ read\_threat\_report (🖼️ injection-report), injection-scanner, extractor, zero-width codec

&#x20;   investigation/                # note\_decision, cti:// resources, investigate\_threat prompt,

&#x20;                                 # in-memory trace store + needs-human queue, auto-logging interceptor

&#x20;   remediation/                  # scan\_manifest (npm/PyPI/Go), prioritise\_findings (🖼️ priority-table),

&#x20;                                 # plan\_remediation, generate\_patch, verify\_fix — osv.client, epss.client,

&#x20;                                 # priority, semver, fix-resolver, patch, manifest-parser

&#x20;   triage/                       # triage\_finding — routes findings, tool-availability downgrade,

&#x20;                                 # enqueues to needs-human queue + persists to the findings table

&#x20;   mitigation/                   # suggest\_mitigation — compensating-control suggestions for no-fix findings

&#x20;   webscan/                      # scan\_website, fingerprint\_technology, scan\_html\_vulnerabilities — headers,

&#x20;                                 # exposed-file probes, TLS cert check, tech-signature + OSV CVE matching,

&#x20;                                 # regex vulnerability scan of raw HTML markup

&#x20;   dnscheck/                     # check\_domain\_security — SPF/DMARC/DKIM via Node's dns module

&#x20;   findings/                     # ingest\_finding, query\_findings, analyze\_finding\_history — classify.ts,

&#x20;                                 # dedupe-key.ts, priority-complexity.ts, findings.service.ts (Supabase)

&#x20; widgets/

&#x20;   app/priority-table/page.tsx  # 🖼️ expandable ranked-findings table

&#x20;   app/injection-report/page.tsx # 🖼️ red quarantine banner / green clean banner + extracted facts

fixtures/

&#x20; poisoned-report.html           # demo weapon: 1 HTML-comment injection, 1 hidden-div injection, 1 zero-width payload

&#x20; clean-report.html              # same article, no injections

&#x20; outdated-package.json          # demo weapon: 5 known-vulnerable npm packages (lodash, minimist, axios, ...)

&#x20; outdated-requirements.txt      # demo weapon: 5 known-vulnerable PyPI packages (django, flask, requests, ...)

&#x20; outdated-go.mod                # demo weapon: 3 known-vulnerable Go modules (jwt-go, yaml.v2, gin)

```





