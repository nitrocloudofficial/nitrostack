# @nitrostack/cli

Official NitroStack CLI for scaffolding, developing, and maintaining MCP server
projects.

[![npm version](https://img.shields.io/npm/v/@nitrostack/cli?style=flat-square)](https://www.npmjs.com/package/@nitrostack/cli)
[![npm downloads](https://img.shields.io/npm/dm/@nitrostack/cli?style=flat-square)](https://www.npmjs.com/package/@nitrostack/cli)
[![license](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](https://opensource.org/licenses/Apache-2.0)

## Installation

### Global installation

Install the CLI globally to use the `nitrostack-cli` command:

```bash
npm install -g @nitrostack/cli
```

After installation, run:

```bash
nitrostack-cli init my-project --template typescript-starter
```

### Using npx

You can also run the CLI without installing it globally:

```bash
npx @nitrostack/cli init my-project --template typescript-starter
```

## Quick Start

```bash
nitrostack-cli init my-project --template typescript-starter
cd my-project
npm run dev
```

## Core Commands

```bash
nitrostack-cli init <project-name> [--template <name>]
nitrostack-cli dev
nitrostack-cli build
nitrostack-cli start
nitrostack-cli generate <type> [name] [--module <name>]
nitrostack-cli install
nitrostack-cli upgrade
```

## Templates

- `typescript-starter`
- `typescript-oauth`
- `typescript-pizzaz`

## NitroStudio

NitroStudio is the recommended companion app for testing and debugging MCP
servers built with NitroStack.

- Download: <https://nitrostack.ai/studio>
- Studio: <https://nitrostack.ai/studio>

## CI/CD and Log Collectors

NitroStack CLI uses Chalk for terminal styling. Chalk automatically detects whether the output environment supports colors, so color output may be disabled when running in non-interactive environments such as redirected or piped output.

In CI environments such as GitHub Actions, you can explicitly control color output with `FORCE_COLOR`:

- **Disable colors:** Set `FORCE_COLOR=0`.
- **Force colors:** Set `FORCE_COLOR=1`.

> **Note:** NitroStack relies on Chalk for terminal color handling. Use `FORCE_COLOR=0` when you need to ensure that colored output is disabled.

## Links

- CLI docs: <https://docs.nitrostack.ai/cli/overview>
- Full docs: <https://docs.nitrostack.ai>
- Source: <https://github.com/nitrocloudofficial/nitrostack>
- npm: <https://www.npmjs.com/package/@nitrostack/cli>
- Blog: <https://blog.nitrostack.ai>

## Community

- Discord: <https://discord.gg/uVWey6UhuD>
- X: <https://x.com/nitrostackai>
- YouTube: <https://www.youtube.com/@nitrostackai>
- LinkedIn: <https://linkedin.com/company/nitrostack-ai/>
- GitHub: <https://github.com/nitrostackai>
