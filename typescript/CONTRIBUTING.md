# TypeScript Workspace Contributing Notes

The canonical contribution process for NitroStack lives at
[`../CONTRIBUTING.md`](../CONTRIBUTING.md).

Use this file only for workspace-specific notes.

## Workspace Scope

This directory contains the TypeScript packages:

- [`./packages/core`](./packages/core)
- [`./packages/cli`](./packages/cli)
- [`./packages/widgets`](./packages/widgets)

## Local Checks (from `typescript/`)

```bash
npm install
npm run lint
npm test
```

For detailed package-linking and local integration workflows, see
[`./LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md).
