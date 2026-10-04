# NitroStack Starter Template

Minimal template for learning NitroStack fundamentals with a calculator-focused
MCP server and basic widgets.

## What This Template Includes

- `calculator` module with tools, resources, and prompts
- TypeScript + Zod validation setup
- Widget-ready project structure
- Production-friendly npm scripts

## Quick Start

```bash
npx @nitrostack/cli init my-server --template typescript-starter
cd my-server
npm run dev
```

## Common Commands

```bash
npm run dev
npm run build
npm start
```

## NitroStudio

NitroStudio is the recommended way to test and debug this template during
development.

- Download: <https://nitrostack.ai/studio>
- Studio: <https://nitrostack.ai/studio>

## MCP protocol version (optional)

This server runs in **`auto` mode by default**, dynamically serving both the new
**2026-07-28** stateless spec and legacy 2025 JSON-RPC clients from a single endpoint.
You can customize the wire revision via environment variable — no code changes are needed:

```bash
# default (when unset): serve both modern and legacy statelessly
NITRO_MCP_PROTOCOL_VERSION=auto

# new stateless spec only (strict mode)
NITRO_MCP_PROTOCOL_VERSION=2026-07-28

# legacy 2025 sessionful wire
NITRO_MCP_PROTOCOL_VERSION=2025-06-18
```

See `.env.example` for details.

## Links

- Docs: <https://docs.nitrostack.ai>
- Templates docs: <https://docs.nitrostack.ai/templates/01-starter-template>
- Main repository: <https://github.com/nitrocloudofficial/nitrostack>

## Community

- Discord: <https://discord.gg/uVWey6UhuD>
- X: <https://x.com/nitrostackai>
- YouTube: <https://www.youtube.com/@nitrostackai>
- LinkedIn: <https://linkedin.com/company/nitrostack-ai/>
- GitHub: <https://github.com/nitrostackai>
