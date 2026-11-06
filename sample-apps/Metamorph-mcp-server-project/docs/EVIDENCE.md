# Evidence and limits: what is real, what is simulated, what is not built

Written 2026-11-01 for the owner and for judges. Labels: LIVE (run for real against real systems), EMULATOR (real client code over the wire against an emulator), FIXTURE (our code against hand-made or recorded data, fakes, or stubs), PROJECTED (an estimate computed by our own code), NOT BUILT. Update this file whenever a label changes.

## Product behaviour
| Capability | Label | Notes |
|---|---|---|
| assess_project, analyze_advisory (OSV, CISA KEV, EPSS, endoflife.date, php.net/Node feeds) | LIVE | Real public data. Rules and the 0-100 score formula are our own, not an industry standard. Built-in EOL tables are an offline fallback. |
| MCP prompts (`modernize`, `cve-triage`, `watch-repo`) | LIVE | prompts/list and prompts/get answered by the built server over HTTP locally. Text templates only. NOT yet confirmed in NitroStudio. |
| check_watch (CISA KEV, EPSS, endoflife.date, php.net and Node release feeds) | LIVE | Run locally against the live feeds (Log4Shell KEV hit, PHP 8.1 EOL date). Not yet confirmed by the owner on the deployed server. |
| Self-service guest keys (`POST /keys/mint`, Get a key button on the landing page) | LIVE | LIVE locally, in-memory per instance (lost on restart or when another instance serves the request). Plan scope, 24 h, 3 per hour per client, 300 active. Not yet confirmed on the deployed server. |
| Browser host page `GET /app` (real widget in a sandboxed iframe, tools over `/mcp`) | LIVE | Run locally over real HTTP with Playwright (assess, plan, preview, report against the demo repo). NOT yet confirmed on the deployed server. |
| plan_modernization, preview_changes | LIVE | Real diffs on real fetched repos. |
| apply_stage | PROJECTED | Patch is real; the re-score uses a simulated lockfile refresh in our code on a temporary copy. Nothing in the user's repo changes. |
| Runner (GitHub Actions workflow, prebuilt image, PHP selection) | LIVE | Dispatched by hand twice on GitHub against php-shop (no patch). Real tool output (trivy, semgrep, composer-audit, gitleaks, checkov, rector). |
| verify_patch (dispatch, poll, artifact, verdict) | FIXTURE | Client tested only against a fake GitHub; NOT yet called live through the deployed server. |
| generate_report PDF / SARIF / SBOM, signed download links | LIVE | Real output, veraPDF PDF/UA-1 passes, link downloaded over real HTTP from the deployed server. SARIF acceptance by GitHub code scanning NOT tested. Key-id binding of links: unit-tested only on the deployed path. |
| Score dashboard widget | FIXTURE | Rendered with a mock host in a browser; report view not yet confirmed inside NitroStudio. Manifest example data is hand-written (the 17 -> 92 plan example is invented; 17 -> 41 apply example matches a real projected result). |
| Scanner normalise / dedupe / measured score | LIVE data, FIXTURE paths | Real runner output for php-shop (34 raw -> 18 distinct). npm-audit extraction never run on real output. |
| cloud_inventory (AWS) | EMULATOR | Moto 5.2.5: STS, Lambda, RDS, EKS, EC2 calls answered, 7/7. NOT run against a real AWS account; ExternalId/IAM enforcement, throttling and real pagination untested. |
| Demo repos (metamorph-demo-legacy: php-shop, node-orders, php-shop-modernized) | AUTHORED BY US | Built with planted vulnerable dependencies; php-shop-modernized is built to score 100; php-shop can never verify green (stub lockfile, no tests). |
| Automated modernization depth | LIMITED | Only 4 stages change files: dependency bumps, runtime version, committed .env handling, packaging templates. Everything else is guidance only. |

## Not built
GitHub branch-PR connector and alerts, Linear, Jira, Slack/Discord/email/n8n notifications, multi-tenant OAuth vault, Azure, IBM Cloud, SonarQube/Snyk pull-mode, one-call `modernize` tool (a `modernize` prompt exists), elicitation, PHP-to-Node conversion, private-repository access (public GitHub repos only).

## Test-suite evidence
- Unit tests use fakes: OSV analyzers, fake GitHub (tests/helpers/fake-github.ts), fake feed clients, stubbed AWS SDK calls, hand-built tar/zip archives, fake clocks. They prove logic, not real-world behaviour.
- Conformance and load scripts run offline with a stubbed fetch and a fixture tarball: protocol and memory behaviour, not real-network latency.
- Ground truth (77/77 planted problems) uses fixtures and rules both written by us: it shows the rules do what they say, not how they do on unknown code.
- Tool-selection check is a deterministic keyword matcher, not a live-model evaluation.
- Strongest evidence: the 20-repo real corpus (real archives at pinned commits, real OSV/EPSS/EOL data, cross-checked against composer/npm audit) and the real runner fixtures.
