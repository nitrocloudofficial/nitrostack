# Architecture

One page. What is real and what is not: `docs/EVIDENCE.md`. Tools, scopes and setup: `README.md`. Threats: `docs/THREAT_MODEL.md`.

## Module map (`src/modules`, NitroStack TypeScript SDK)
| Module | Tools / resources | Role |
|---|---|---|
| `intake` | `analyze_advisory` | OSV lookup by advisory id or `ecosystem:name@version`, bulk querybatch, cache |
| `assessment` | `assess_project` | Fetch repo archive, find projects (up to 3 levels, at most 5), PHP and Node inventory, rules, score, ranking (known-exploited, severity, EPSS) |
| `planning` | `plan_modernization`, `preview_changes`, `apply_stage` | Staged plan, patch generators, preview with approval token, projected apply on a temp copy |
| `feeds` | `check_watch` | CISA KEV, EPSS, endoflife.date, php.net and Node release feeds |
| `report` | `generate_report`, `metamorph://report/{id}` (.pdf, .sarif, .cdx.json) | PDF, SARIF 2.1.0, CycloneDX 1.5, in-memory cache, signed `/reports/<id>.<ext>` route |
| `verify` | `verify_patch` | GitHub Actions client: dispatch baseline and patched runs, poll, read `result.json` |
| `scanners` | (used by verify and report) | Normalise runner tool output into one finding shape, deduplicate, measured score, KEV/EPSS enrichment |
| `cloud` | `cloud_inventory`, `metamorph://aws/readonly-role.yaml` | AWS read-only inventory and end-of-life findings |
| `common` | | Key and scope guard, approval and download tokens, redaction, safe archive extraction, input validation, tool annotations |
| `src/widgets` | | One MCP Apps widget, `score-dashboard` (Next.js static export), views for assessment, plan, apply, verify, report |
| `runner/` | | Docker image and script the GitHub Actions workflow runs (trivy, semgrep, composer-audit, gitleaks, checkov, rector) |

## Data flow
1. Client calls a tool at `/mcp` (Streamable HTTP) with a Bearer key. The scope guard runs first, then input validation.
2. For repository tools the server downloads a public GitHub archive into a private temp folder, extracts it with path, symlink and size checks, reads and parses files, and deletes the folder.
3. Dependencies go to OSV in batches; KEV, EPSS and end-of-life data come from the public feeds. Findings are ranked and scored with our own formula.
4. `preview_changes` builds a diff and signs an approval token (HMAC over plan hash, patch hash, stage; 300 s).
5. `apply_stage` checks the token, applies the patch to a temp copy, re-scores it, returns the patch and a projected score.
6. `verify_patch` (operator-configured) asks a GitHub Actions workflow in a separate runner repository to build and test baseline and patched code, and reads back the result artifact.
7. `generate_report` renders PDF, SARIF and SBOM into a 10 minute in-memory cache and returns signed links. The browser fetches `/reports/...` directly.
8. Optional: `cloud_inventory` and `generate_report` with `include_cloud` assume a customer-created read-only AWS role.

## Trust boundaries
- Client to server: authenticated by key, authorized by scope (`read` < `plan` < `write`). Tool annotations are hints only; the guard enforces access.
- Server to the repo: the repo is untrusted data. It is parsed, never installed, built or run on the host. Names and versions from manifests must look like identifiers before they reach output.
- Server to the network: repository archives from `codeload.github.com` only; fixed hosts for OSV and the feeds; GitHub API and AWS only when the operator configured them.
- Build and test of project code: only in the GitHub Actions runner, outside the server.
- Secrets: keys stored as hashes; token secret, runner token and AWS settings only in host environment; redaction on outputs and logs.
- Downloads: signed, expiring, bound to the requesting key id; the link itself is a bearer capability.
