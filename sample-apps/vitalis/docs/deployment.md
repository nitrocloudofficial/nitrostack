# Railway deployment and release verification

This document is the primary deployment procedure for Vitalis. It intentionally does not claim a public endpoint; replace placeholders with the URL and secrets from the actual Railway project.

## 1. Create the service

1. Create a Railway project from the GitHub repository.
2. Use Node.js 22 or newer.
3. Enable automatic deploys only for the protected `main` branch after CI passes.
4. Add a persistent volume for `logs/` if audit JSONL must survive restarts. Otherwise configure an external log sink and treat the local audit file as ephemeral.

## 2. Build and start commands

```text
Build command: npm ci && npm --prefix src/widgets ci && npm run build
Start command: npm run start:prod
MCP transport: http
MCP endpoint: /mcp
```

Railway should provide `PORT`; set `HOST=0.0.0.0`. The server also supports a local stdio fallback:

```bash
MCP_TRANSPORT_TYPE=stdio npm run start:prod
```

## 3. Required production variables

Set these in Railway’s secret/environment UI, never in Git:

```env
NODE_ENV=production
MCP_TRANSPORT_TYPE=http
HOST=0.0.0.0
# PORT is supplied by Railway
ENABLE_CORS=true

API_KEY_CLINICIAN=<random secret>
API_KEY_READONLY=<random secret>
API_KEY_ADMIN=<random secret>
VITALIS_ALLOW_ANONYMOUS_DEMO=false

CONTACT_EMAIL=operator@example.com
NCBI_EMAIL=ncbi-contact@example.com
VITALIS_SAFETY_LAYER=on
AUDIT_LOG_PATH=logs/audit.jsonl
```

Optional variables include `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, upstream API keys, WHO ICD-11 credentials, and overrideable upstream base URLs. Production boot fails if it has no API key/JWT credential, `CONTACT_EMAIL`, or `NCBI_EMAIL`.

## 4. Storage and logs

- Application logs go to stderr-compatible NitroStack logging; do not redirect normal stdio output into the MCP protocol stream.
- Audit events are redacted, bounded, hashed, and written as JSONL by the asynchronous `audit.entry` consumer.
- `AuditStore` keeps the newest 50 entries in memory and trims the persistent file to 5,000 lines.
- A Railway volume or external sink is required if audit history must persist across deploys.
- API keys, JWTs, patient free text, and real credentials must not appear in logs or fixtures.

## 5. Public endpoint verification

After Railway reports the service healthy, set:

```bash
export MCP_URL="https://<railway-domain>/mcp"
export READONLY_KEY="<read-only-key>"
export ADMIN_KEY="<admin-key>"
```

Run MCP initialize with a client or a protocol-aware script. Verify all of the following against the deployed URL:

1. `initialize` succeeds.
2. `tools/list`, `resources/list`, and `prompts/list` return the expected inventory.
3. A read-only call to `triage_get_care_options` succeeds with `READONLY_KEY`.
4. Missing and invalid keys return `AUTH_DENIED`.
5. `READONLY_KEY` cannot call `care_draft_referral` (`SCOPE_DENIED`).
6. `ADMIN_KEY` can read `vitalis://audit/recent` and `vitalis://metrics`.
7. `health://checks` is listed and readable according to the deployment’s authenticated resource policy.
8. Widget resources and `widget://examples` are listed; all six widget URIs are present.
9. Audit JSONL receives one bounded entry per call and includes no raw key.
10. The HTTPS certificate, CORS policy, Railway logs, and restart behavior are correct.

Do not publish the endpoint in README or a demo script until these checks pass with the real deployed credentials.

## 6. Rollback

1. Every production deploy must point to a commit SHA and a release tag.
2. If a deploy fails, redeploy the previous successful commit/tag in Railway.
3. Keep the previous environment-variable configuration available; rotate keys separately if exposure is suspected.
4. If Railway is unavailable, use the local stdio fallback with synthetic fixtures and explicitly disclose that the public endpoint is unavailable.
5. Never disable the safety layer or anonymous restrictions as a production rollback strategy.

## 7. Demo fallback

For a local demo without a public endpoint:

```bash
cp .env.example .env
# Set local random API keys, CONTACT_EMAIL, and NCBI_EMAIL
npm ci
npm --prefix src/widgets ci
MCP_TRANSPORT_TYPE=stdio npm run verify
npm run dev
```

Use NitroStudio or another MCP client over stdio. Demo claims must identify live upstream calls, synthetic FHIR data, safety escalation, audit/scope checks, and any upstream degradation honestly.
