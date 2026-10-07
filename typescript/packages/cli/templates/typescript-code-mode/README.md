# Code Mode MCP Service

A high-performance Model Context Protocol (MCP) service utilizing QuickJS WebAssembly sandboxing for code-mode orchestration.

## Features
- **Code Mode Sandbox**: Execute complex multi-tool workflows within an isolated, memory-bounded QuickJS runtime.
- **Catalog Browsing**: Calling `search` with no query (or a generic one like "show tools") returns a brief index of available tools, capped at 20.
- **Micro-Tool Orchestration**: Micro-tools run locally inside the worker sandbox, slashing LLM prompt token usage by >80%.
- **Type-Safe Sandbox**: Ambient declarations in `nitro-sandbox.d.ts` provide IDE autocomplete for `callTool`.

## Getting Started
```bash
npm install
npm run build
npm run dev
```
