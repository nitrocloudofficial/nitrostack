# Code Mode MCP Service

A high-performance Model Context Protocol (MCP) service utilizing QuickJS WebAssembly sandboxing for code-mode orchestration.

## Features
- **Code Mode Sandbox**: Execute complex multi-tool workflows within an isolated, memory-bounded QuickJS runtime.
- **Micro-Tool Orchestration**: Micro-tools run locally inside the worker sandbox, slashing LLM prompt token usage by >80%.
- **Type-Safe Sandbox**: Ambient declarations in `nitro-sandbox.d.ts` provide IDE autocomplete for `callTool`.

## Getting Started
```bash
npm install
npm run build
npm run dev
```
