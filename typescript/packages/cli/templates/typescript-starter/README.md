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

This server speaks the current 2025-era MCP transport by default. To opt into the
new **2026-07-28** stateless spec (or serve both eras at once for validation),
set an environment variable — no code changes are needed:

```bash
# new stateless spec only
NITRO_MCP_PROTOCOL_VERSION=2026-07-28
# both eras from one process (validate mixed clients)
NITRO_MCP_PROTOCOL_VERSION=auto
```

Unset keeps today's behavior. See `.env.example` for details.

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
