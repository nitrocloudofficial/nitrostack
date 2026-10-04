# NitroStack Pizzaz Template

Template focused on rich, interactive widget experiences (map/list/detail flows)
using the NitroStack widget SDK patterns.

## What This Template Includes

- Widget-heavy module and UI structure
- Interactive examples for advanced frontends
- Optional map provider integration pattern
- Studio-friendly development workflow

## Quick Start

```bash
npx @nitrostack/cli init my-pizzaz-app --template typescript-pizzaz
cd my-pizzaz-app
npm run dev
```

## Optional Configuration

If this project uses a map provider, configure API tokens in widget `.env` files
as documented in the template source.

## Common Commands

```bash
npm run dev
npm run build
npm start
npm run widget <command>
```

## NitroStudio

NitroStudio is the fastest way to test and debug interactive widget output.

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
- Widgets docs: <https://docs.nitrostack.ai/sdk/typescript/ui/widgets>
- Main repository: <https://github.com/nitrocloudofficial/nitrostack>

## Community

- Discord: <https://discord.gg/uVWey6UhuD>
- X: <https://x.com/nitrostackai>
- YouTube: <https://www.youtube.com/@nitrostackai>
- LinkedIn: <https://linkedin.com/company/nitrostack-ai/>
- GitHub: <https://github.com/nitrostackai>
