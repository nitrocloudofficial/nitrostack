# ImmunoGraph NitroStack MCP

Team ImmunoGraph hackathon sample app for NitroStack.

ImmunoGraph is a biomedical MCP server for immunoinformatics workflows. It
helps an AI client validate protein sequences, generate candidate peptides,
predict MHC-I/MHC-II and B-cell signals, normalize evidence, rank vaccine
candidates, inspect protein structure context, evaluate chemistry inputs, run
docking-oriented checks, and export research reports.

The project is packaged as a standalone NitroStack CLI application for local
testing and NitroCloud deployment.

## Structure

```text
src/
  index.ts
  app.module.ts
  modules/
    prediction/
    evidence/
    constraint/
    structure/
    chemistry/
    docking/
    report/
  widgets/
  lib/
    algorithms/
    database/
data/
nitrostack.config.ts
```

The layout follows the NitroStack CLI scaffold: root `package.json`,
`tsconfig.json`, `src/index.ts`, `src/app.module.ts`, and feature modules under
`src/modules`.

## Commands

```powershell
npm install
npm run dev
npm run build
npm start
```

These commands intentionally use the NitroStack CLI:

- `npm run dev` -> `nitrostack-cli dev`
- `npm run build` -> `nitrostack-cli build`
- `npm start` -> `npm run build && nitrostack-cli start`

## NitroCloud

Use this folder (`sample-apps/immunograph-mcp`) as the NitroCloud deployment
root.

Build command:

```text
npm run build
```

Start command:

```text
npm run start:prod
```

The NitroStack CLI injects `PORT` for `nitrostack-cli start`. For OAuth
metadata, set `RESOURCE_URI` to the public NitroCloud URL. Keep
`OAUTH_REQUIRED=false` unless `JWKS_URI` or `INTROSPECTION_ENDPOINT` is also
configured.

## Environment

Copy `.env.example` to `.env` for local testing. For NitroCloud, set the same
values in the deployment environment instead of committing a `.env` file.

The default configuration runs deterministic/offline fallbacks where possible.
Live scientific integrations require their external CLIs or Python packages to
exist in the runtime image, for example Open Babel, RDKit, AutoDock Vina, PLIP,
fpocket, FreeSASA, PyMOL, and the IEDB population coverage script.

Do not commit real API keys. If `LLM_ENABLED=true`, set `OPENAI_API_KEY` only in
the deployment secret manager.
