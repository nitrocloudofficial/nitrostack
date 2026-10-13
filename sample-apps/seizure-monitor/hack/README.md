# ERP Query AI — TypeScript port

This directory contains a NitroStack MCP server port of the supplied Python
pipeline. It exposes `query_erp` (execute a safe read-only query) and
`plan_erp_query` (generate SQL/plan without execution) as MCP tools. It uses
`groq-sdk` for model calls and `mysql2` for database access.

## Run

```powershell
cd converted-ts
npm install
Copy-Item .env.example .env
npm run build
npm start
```

Set `GROQ_API_KEY` and the `DB_*` variables in `.env`. The MCP HTTP endpoint
listens at `http://localhost:3000/mcp` by default.

## NitroCloud deployment

In the NitroCloud dashboard, create a project from this folder or its Git
repository, set the build command to `npm run build` and the start command to
`npm start`, then add the environment variables below. The MySQL database must
be reachable from NitroCloud and should use a least-privilege, read-only
database account.

Before deploying, set the following NitroCloud secrets (never commit them):
`GROQ_API_KEY`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.
For TLS-only managed MySQL, also set `DB_SSL=true` and `DB_SSL_CA` to the
provider's CA certificate (with newline characters represented as `\n`).

The large schema and SQL dump are retained unchanged because they are data
assets, not Python source.
