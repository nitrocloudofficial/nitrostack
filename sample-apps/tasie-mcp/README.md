# TASIE MCP

TASIE — autonomous SAST + real exploit + human-gated remediation — exposed as an
**MCP app** (NitroStack + NitroCloud), so ChatGPT and other MCP clients can scan
code for vulnerabilities and get proof-carrying remediation.

This Node/TypeScript service is a **thin MCP surface** over the TASIE FastAPI
backend (`demo/backend/`). All detection, live exploitation and patching happens
in the Python engine; this app forwards tool calls over HTTP.

## Architecture

```
ChatGPT / Studio  ──MCP──▶  tasie-mcp (this app)  ──HTTP──▶  TASIE FastAPI backend
                                                              (~90 engines + Docker
                                                               exploit sandbox)
```

The backend URL is `TASIE_API_BASE` (default `http://localhost:8000`).

- **Stateless tools** (`scan_code`, `scan_dependencies`, `detect_frameworks`)
  send the code/manifest inline — they work against any reachable TASIE host.
- **Backend-state tools** (`remediate_file`, `scan_repo`) act on files that live
  on the TASIE host and need the full Docker-enabled deployment.

## Tools

| Tool | Backend route | Needs Docker host | Purpose |
|------|---------------|-------------------|---------|
| `scan_code` | `POST /api/analyze` | no | Static scan of inline source → ranked findings (renders **scan-report** widget) |
| `scan_dependencies` | `POST /api/depscan` | no | SCA over an inline dependency manifest |
| `detect_frameworks` | `POST /api/frameworks` | no | Fingerprint web framework(s) + attack surface |
| `remediate_file` | `POST /api/remediate` | yes | Detect → live-exploit → patch → re-verify a host file |
| `scan_repo` | `POST /api/scan-repo` | yes | Route discovery + scan of a repo on the host |
| `tasie_health` | `GET /health` | no | Backend reachability + which endpoint is wired |

## Setup

```bash
npm install                 # main app
npm --prefix src/widgets install   # widget subpackage (or run `npm run dev`)
cp .env.example .env        # then set TASIE_API_BASE
```

Start the TASIE backend first (from `demo/backend`):

```bash
.venv/Scripts/python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

## Run

```bash
npm run dev        # MCP server (STDIO) + widget dev server (:3001)
```

Then connect in **NitroStudio** → Add Server → Nitro Project → this folder →
Studio App Canvas. Test `scan_code` on the Tools page; the **TASIE Scan Report**
widget renders the findings.

## Deploy (NitroCloud → ChatGPT)

1. Set `TASIE_API_BASE` to a **publicly reachable** TASIE host (a cloud VM/Docker
   host running `demo/backend`). NitroCloud deploys only this Node app — the
   Python engine + exploit sandbox must be hosted separately.
2. In Studio App Canvas: **Link to app / Create Cloud App → Deploy**.
3. In ChatGPT: Settings → Plugins → **Developer mode** (Plus/Pro) → **+** →
   Server URL = `{serviceUrl}/sse` → Create → Connect.

> Cloud builds run on **Node 20** (`engines` pins `20.x`). Local dev on newer
> Node works but test against 20 before deploying.

## Config

| Var | Default | Meaning |
|-----|---------|---------|
| `TASIE_API_BASE` | `http://localhost:8000` | TASIE backend base URL |
| `TASIE_API_KEY` | — | optional bearer token (`Authorization: Bearer …`) |
| `TASIE_TIMEOUT_MS` | `120000` | per-request timeout |

## Notes

- `ctx.logger` only inside tools — `console.*` breaks the STDIO transport.
- Verified end-to-end: `scan_code` on a Flask SQLi sample returns
  `critical / CWE-89 / OWASP A03` from the live backend.
