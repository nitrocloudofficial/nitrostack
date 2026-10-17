# Dep Bouncer: code walkthrough

## The 60-second version

When an agent calls `bouncer_check_package {"name":"axios"}`, NitroStack routes the MCP tool to `BouncerTools.checkPackage` in [`src/modules/bouncer/bouncer.tools.ts`](../src/modules/bouncer/bouncer.tools.ts). `@Widget('verdict-card')` also tells the client to render the result in the verdict card. `BouncerService.checkPackage` in [`src/modules/bouncer/bouncer.service.ts`](../src/modules/bouncer/bouncer.service.ts) asks `NpmRegistryService.getPackument` for package metadata and resolves `latest` (or the requested tag, exact version, or supported range). A missing package or npm security placeholder gets a direct BLOCK; a removed version gets a separate report.

For a published version, `liveContext` builds an `AnalysisContext`: the target manifest, up to ten earlier versions (same major line preferred), publish times, weekly downloads, a tarball loader, and a lookup function for dependencies. `TarballService.fetchFiles` downloads only the target and comparison release tarballs from `registry.npmjs.org`; `OsvService.query` asks OSV about the exact version. In parallel, `AnalysisService.analyze` runs seven signal classes: provenance, publisher, install script, new dependencies, release timing, code diff, and name similarity. The eighth, `known-advisory`, is added by `BouncerService` when OSV returns a `MAL-` advisory.

Each signal emits evidence-backed `Finding`s. `decide` in [`src/modules/analysis/verdict.ts`](../src/modules/analysis/verdict.ts) sums their weights, caps at 100, and chooses ALLOW, REVIEW, or BLOCK. `BouncerService` adds OSV/npm-audit/cooldown context and searches earlier versions for one that gets ALLOW when needed. The returned `Report` contains findings, notes, checks run, verdict, score, and possibly a safe version. The MCP client receives that report and can display it through [`src/widgets/app/verdict-card/page.tsx`](../src/widgets/app/verdict-card/page.tsx).

## MCP and NitroStack in this project

MCP (Model Context Protocol) defines ways a client and server exchange callable tools and supporting context. In this project NitroStack decorators register those server surfaces:

- **Tool:** a callable operation with a schema. `@Tool` methods in [`src/modules/bouncer/bouncer.tools.ts`](../src/modules/bouncer/bouncer.tools.ts) include `bouncer_check_package`, `bouncer_check_upgrade`, `bouncer_safe_version`, `bouncer_review_install_scripts`, `bouncer_check_manifest`, `bouncer_diff_release`, and `bouncer_replay_incident`. Zod schemas validate inputs. `@RateLimit` limits calls; selected methods use `@Widget('verdict-card')` to attach the UI.
- **Resource:** read-only context addressed by a URI. `@Resource` methods in [`src/modules/bouncer/bouncer.resources.ts`](../src/modules/bouncer/bouncer.resources.ts) publish `bouncer://policy` and `incidents://list`.
- **Prompt:** reusable messages and instructions for the client to give a model. `@Prompt({ name: 'safe_install' })` is on `BouncerPrompts.safeInstall` in [`src/modules/bouncer/bouncer.prompts.ts`](../src/modules/bouncer/bouncer.prompts.ts).
- **Widget:** the `@Widget` decorator associates a tool result with the `verdict-card` widget. Its manifest is [`src/widgets/widget-manifest.json`](../src/widgets/widget-manifest.json), and the React page is [`src/widgets/app/verdict-card/page.tsx`](../src/widgets/app/verdict-card/page.tsx). It renders verdict and evidence; the tool result remains the data source.
- **MCP Task:** a long-running tool call with progress and cancellation support. `bouncer_check_manifest` declares `taskSupport: 'optional'`; `BouncerTools.checkManifest` passes progress updates and a cancellation check into `BouncerService.checkManifest`. The service checks up to 60 dependencies, with four workers, and reports truncation/cancellation.
- **Health check:** a named status probe registered with `@HealthCheck`. [`src/health/system.health.ts`](../src/health/system.health.ts) measures process uptime/memory; `registry.health.ts` pings npm; `osv.health.ts` queries OSV. `AppModule` registers all three.

Dependency injection (DI) constructs providers and supplies their declared dependencies. `@Injectable({ deps: [...] })` explicitly lists constructor dependencies for classes such as `BouncerService`, `AnalysisService`, and `BouncerTools`; simple services use `@Injectable()`. `@Module` groups providers and exports. [`src/app.module.ts`](../src/app.module.ts) imports Registry, Analysis, Incidents, and Bouncer modules flatly because its comment says NitroStack only registers providers from directly imported modules. Bouncer also lists its dependencies in its module for documentation, but the root imports them directly so their providers are registered.

## Authentication

Tools are open by default for the public demo: they are read-only, live checks are rate-limited, and the server holds no user data. An organization can set `DEP_BOUNCER_API_KEYS` to comma-separated strong random keys and restart the server. Clients supply one key in MCP request `params._meta.apiKey` or `params._meta["x-api-key"]`; a bare HTTP header is not bridged by the SDK's legacy transport. `BouncerApiKeyGuard` uses NitroStack's `ApiKeyModule` with hashed configured keys and `@UseGuards` on every bouncer tool. Missing or invalid keys fail with an explicit error. Unset or empty configuration keeps tools public; resources and prompts always stay open.

`ObservabilityModule` is imported directly by `AppModule` and exports `MetricsService` and the class-level `MetricsInterceptor`. `bouncer://stats` exposes aggregate call/error counts, p50/p95 latency over each tool's last 200 completed calls, lifetime verdict totals, uptime, start time, and the package version; metrics store no request contents, IPs, or keys. Guards run before interceptors, so denied requests are not counted. `@Cache` keeps incident replays (keyed by incident ID), policy, and the incident list for 3600 seconds, including resource methods because the SDK decorator wraps their handlers directly. Stats and live-check tools are not cached at the tool level.

## Module by module

### Registry

[`src/modules/registry/`](../src/modules/registry/) contains `NpmRegistryService` for package metadata/download stats and dependency lookups, `OsvService` for advisory queries, `TarballService` for bounded tarball fetching/parsing, `semver.ts` for a small supported range implementation, `http.ts` for request helpers, and `TtlCache` for short-lived cached/in-flight requests. `RegistryModule` exports the three services.

**Gotcha:** `semver.ts` is deliberately a subset, not the full npm `semver` package; unsupported range syntax may not behave like npm. Tarball data is parsed into memory and files outside regular archive entries are not materialized.

### Analysis

[`src/modules/analysis/`](../src/modules/analysis/) defines `AnalysisContext`, `Finding`, `Signal`, and `VersionManifest` in `signal.ts`; `AnalysisService` runs signals with a 25-second per-signal timeout; `verdict.ts` owns the score policy. `code-patterns.ts` contains text/path heuristics, `name-similarity.ts` compares names, and `popular-packages.ts` loads the bundled popularity list. The signal classes are in `signals/`.

**Gotcha:** pattern matches are heuristics on release deltas, not proof that source is malicious; a signal exception or timeout becomes a visible zero-weight info finding.

### Incidents

[`src/modules/incidents/`](../src/modules/incidents/) contains `IncidentsService`, which loads five JSON fixtures and converts them into replay `AnalysisContext`s. `IncidentsModule` exports that service.

**Gotcha:** the bad-version files are reconstructed benign stand-ins, not the removed malicious tarballs. Replays are informative simulations, not execution of the original malware.

### Bouncer

[`src/modules/bouncer/`](../src/modules/bouncer/) exposes MCP controllers, `BouncerService` orchestration, and `ReleaseDiffService` for user-requested comparisons. `BouncerService` resolves versions, gathers data, runs analysis, constructs reports, finds safe versions, handles manifest checks, and replays incidents.

**Gotcha:** “safe version” means the newest candidate tried that returned ALLOW under current checks, not a guarantee of safety; `safeVersion` checks at most four newest candidates in its range.

### Health

[`src/health/`](../src/health/) provides process, npm, and OSV health probes, registered as providers by `AppModule`.

**Gotcha:** health probes report service availability and latency. They do not guarantee every package check can complete or that all signals have enough data.

### Widgets

[`src/widgets/`](../src/widgets/) is a separate Next.js app. `widget-manifest.json` declares the verdict card, and its page consumes the MCP tool result to show the verdict, findings, notes, and safe-version action.

**Gotcha:** the widget is a presentation layer. The analysis and decision happen on the server, so a client can still inspect the structured tool output without the card.

## Every signal

Weights are shared in [`src/modules/analysis/signal.ts`](../src/modules/analysis/signal.ts): info 0, warn 15, high 35, critical 70. Any critical finding blocks regardless of the sum.

| Signal and file | Rule in plain English | Incidents / likely false positive |
|---|---|---|
| `provenance-drop` — [`provenance-drop.signal.ts`](../src/modules/analysis/signals/provenance-drop.signal.ts) | If target lacks an attestation and at least one of up to five same-major recent releases had one, emit high (35) if the latest had one, otherwise warn (15). | axios, nx. A legitimate release may be built outside CI or attestation publishing can fail. |
| `publisher-change` — [`publisher-change.signal.ts`](../src/modules/analysis/signals/publisher-change.signal.ts) | If at least two consecutive historical same-line releases came from `GitHub Actions`, a non-CI target publisher is high (35). A never-seen publisher is warn (15); CI with attestation is accepted. | axios; chalk has a new-publisher warning. A legitimate maintainer change or publishing migration can trigger it. |
| `install-script` — [`install-script.signal.ts`](../src/modules/analysis/signals/install-script.signal.ts) | Compares `preinstall`, `install`, `postinstall`. New or changed hook against the newest baseline is high (35); first release with hooks is warn (15). | keyv, nx, tinycolor. Native packages may legitimately add or change setup scripts. |
| `new-deps` — [`new-deps.signal.ts`](../src/modules/analysis/signals/new-deps.signal.ts) | Checks at most 10 newly added non-own-scope dependencies. Adds one point each for creation under 7 days ago, install hooks, look-alike name, and (unless optional) no crude import-string reference. Missing package is three points. Score 3 => critical 70; 2 => high 35; 1 => warn 15. | axios. Optional platform packages skip the unreferenced check; monorepo/platform splits or computed imports can still look phantom. |
| `release-timing` — [`release-timing.signal.ts`](../src/modules/analysis/signals/release-timing.signal.ts) | Warn (15) if published less than 24 hours ago; another warn if four or more versions appeared in the six hours ending at target publication. | All replays are fresh in their replay clock. Normal urgent releases and release trains can be fresh/bursty. |
| `code-diff` — [`code-diff.signal.ts`](../src/modules/analysis/signals/code-diff.signal.ts) and [`code-patterns.ts`](../src/modules/analysis/code-patterns.ts) | SHA-256 compares files to newest baseline; removed files are ignored. Scans added/changed source and selected paths for exec/eval, credential paths/environment dumps, exfil hosts/IPs, wallet hooks, AI CLI bypass and autorun, persistence, obfuscation/entropy, packed payloads and native install. One finding per category, generally using the strongest hit. New install-script-referenced code and wallet-plus-obfuscation are critical; no prior release lowers severity one step. | chalk, keyv, nx, tinycolor. Bundled/minified code, legitimate CLI process use, wallet integrations, or credential deny-lists can resemble patterns. |
| `name-check` — [`name-check.signal.ts`](../src/modules/analysis/signals/name-check.signal.ts) | Compare to bundled popular names using edit/transposition/separator/suffix/affix rules. A look-alike is high (35) if downloads are under 10,000 or package created within 90 days; otherwise info (0). | Typosquats / hallucinated names. Legitimate forks and similarly named packages can match. |
| `known-advisory` — added in `BouncerService.checkPackage` | OSV returns advisories for exact package/version; an ID beginning `MAL-` or alias beginning `MAL-` creates a critical finding (70). Other advisory entries are reported as context. | Anything already listed in OSV as malware. An incorrectly attributed or overly broad OSV record could flag a version. |

## The verdict math

The weights come from signal severity: warn 15, high 35, critical 70; info contributes 0. `decide` sums positive-weight findings, caps the score at 100, and sorts the evidence by severity. Any critical means BLOCK. Without critical findings: below 30 is ALLOW; 30 through 69 is REVIEW; 70 or above is BLOCK.

For the axios 1.14.1 replay, `new-deps` sees the new `plain-crypto-js`: it is under seven days old, has an install script, resembles `crypto-js`, and has no import reference. Its internal points cap at three, so it creates a critical finding worth 70. `provenance-drop` adds 35 and the trusted-publisher change adds 35. Their total is 140, capped at 100; the critical finding independently ensures BLOCK. The benchmark snapshot records axios at score 100.

## The replays

The five fixtures are axios, keyv, nx, chalk, and tinycolor under [`src/modules/incidents/fixtures/`](../src/modules/incidents/fixtures/). They combine real metadata about a last-good release and public incident details with reconstructed target manifests/files. [`scripts/build-fixtures.mjs`](../scripts/build-fixtures.mjs) documents and builds the fixture data: it downloads pinned last-good tarballs from the public npm registry, reads their package files/metadata, then generates target-release changes described by public reporting. It writes a warning header into stand-in code. Bad release code is not taken from the registry because the malicious versions were removed; no malware is saved in the repository. `IncidentsService.toContext` marks these contexts `reconstructed`, and replay reports include `real`, `reconstructed`, sources, advisory lag, and a disclaimer. The simulated clock is 30 minutes after publication.

## Safety design

`TarballService` accepts only URLs whose origin is `https://registry.npmjs.org`, uses a 20-second abort timeout, and caps compressed downloads at 25 MB, decompressed output at 70 MB during gzip, accepted file bytes at 60 MB, and regular files at 5,000. `parseTarGz` rejects traversal and absolute paths and ignores links/special entries. It stores parsed bytes in memory. No package code is executed. Registry and OSV HTTP helpers use timeouts; OSV queries use 10 seconds and failures are returned as `available: false`. `@RateLimit` sets per-tool call limits (for example 30/minute for package check, 10/minute for safe-version lookup, and 3/minute for manifest checks). `AnalysisService` times out each signal after 25 seconds; failures become info notes with zero weight, while unavailable evidence is surfaced. Thus signal failure does not itself block and does not silently disappear. Missing package names, npm security placeholders, and removed versions have dedicated handling; registry failures can still make a tool call fail or leave a signal without evidence, so the verdict is not a promise of safety.

## Tests, benchmark and CI

Tests use Node's built-in `node:test` runner through `npm test` (`tsx` loads TypeScript). The files cover:

- `replay.test.ts`: all five replays block with the expected signal IDs, keyv blocks despite valid provenance, verdict thresholds.
- `incidents.test.ts`: fixture loading, labelled stand-ins and replay contexts.
- `contract.test.ts`: the shared severity weights.
- `code-patterns.test.ts`, `code-diff.signal.test.ts`: pattern matching, severity, release-delta filtering and scan limits.
- `name-similarity.test.ts`, `name-check.signal.test.ts`: look-alike matching and signal severity.
- `release-diff.test.ts`: metadata/file diffs, scan caps and download failures.
- `tarball.test.ts`: tar parsing, path safety, size/file caps, registry-only URL and HTTP cases.
- `semver.test.ts`: supported comparisons and range forms.
- `health.test.ts`: health check status behavior.

`npm run bench` runs [`scripts/benchmark.mjs`](../scripts/benchmark.mjs): it builds/starts the server over stdio, calls the replay tool for five bundled incidents, then checks each name in `bench/packages.txt` at the current npm `latest`. It writes `bench/results.json` and `bench/RESULTS.md`; popular releases are presumed healthy, not independently confirmed. The 2026-10-16 snapshot is 5/5 replays blocked, and 60 popular latest releases had 58 ALLOW, 2 REVIEW, 0 BLOCK. The REVIEWs were webpack and vitest, each with one weak code finding and publication under 24 hours earlier. CI in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs Node 22 and 24: `npm ci --ignore-scripts` for root and widget, typecheck, tests, build, and the replays-only benchmark.

## Likely judge questions with short answers

1. **Why not just use `npm audit`?** It depends on published advisories. The README's five incidents had OSV delays of 1.7 to 18.2 hours; Dep Bouncer compares a release with its own recent history while that gap exists.
2. **Why not Socket or another malware feed?** Those tools are complementary and can block once a vendor feed knows a package. Dep Bouncer uses package history and gives evidence plus a candidate version to use.
3. **Why not impose a cooldown?** A blanket delay also holds clean releases and urgent fixes. Release age is only one weak signal here, and the report can show it alongside other findings.
4. **What if the attacker avoids your patterns?** Code heuristics can miss novel behavior. Publisher, provenance, scripts, dependency and timing signals are independent clues, but none guarantees detection.
5. **How do you know the false-positive rate?** You do not know a general rate from this benchmark. The 60 latest packages are a presumed-healthy sample, not verified truth; 2 REVIEWs are candidates, and the sample changes over time.
6. **Is this real malware in the repository?** No. The fixtures label benign stand-in code. Last-good release material and incident facts are real; bad-release code is reconstructed from reports because npm removed it.
7. **Why MCP?** The caller is an AI agent that can call a structured tool before install, read the result/evidence, and follow ALLOW/REVIEW/BLOCK. Resources, a reusable prompt, tasks, and widget support that interaction.
8. **Does provenance prove a package is safe?** No. It says where a release was built. Keyv's replay has valid provenance and is still blocked by other evidence.
9. **What happens when OSV is down?** `OsvService.query` returns unavailable status and no advisory finding; the remaining signals still run. That cannot establish that OSV has no advisories.
10. **Does it run package scripts to inspect them?** No. It reads manifest scripts and tarball contents but does not execute package code.
11. **What does “safe version” mean?** It is an earlier or candidate version that scored ALLOW in the checks. The implementation only tries a small number of candidates, so this is evidence-based guidance, not a security guarantee.
12. **Can it inspect every dependency in a manifest?** It checks up to 60 plain registry ranges with four workers. Non-registry forms are skipped, and larger manifests are marked truncated.
13. **Why does a brand-new package get extra suspicion?** A look-alike that is new or has few downloads is a common typo/hallucination shape. The heuristic can also catch legitimate new forks, which is why evidence is shown.
14. **What would you build next?** The README lists PyPI, lockfile/CI mode, and organization policies such as always reviewing new publishers. Those are roadmap ideas, not current features.
15. **Can it guarantee the verdict is correct?** No. It uses heuristics and public metadata; an attacker can avoid known patterns, and unavailable data can limit checks. The report is a decision aid with evidence, not proof.
