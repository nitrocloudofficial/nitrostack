# Shared Agent Memory MCP Server

A MCP server that gives AI agents persistent, shared memory. When Agent A researches something, Agent B can recall that decision without repeating work.

## Project Structure

```
├── nitrostack-server/     # Deployable MCP server (TypeScript / NitroStack)
│   ├── src/
│   │   ├── index.ts
│   │   ├── app.module.ts
│   │   └── modules/memory/
│   │       ├── memory.tools.ts      # 7 MCP tools
│   │       ├── memory.service.ts    # Business logic
│   │       └── sqlite.service.ts    # SQLite storage
│   ├── test.ts
│   ├── package.json
│   └── tsconfig.json
│
└── python-prototype/      # Original Python prototype + dashboard
    ├── backend/           # Python MCP server
    ├── agents/            # Demo agents (research, coding, testing)
    └── dashboard/         # React timeline UI
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `remember` | Store a memory (fact, decision, event, or result) |
| `recall` | Search memories by keyword |
| `get_task_memory` | Get all memories for a task, grouped by type |
| `get_decisions` | Get decisions for a project/task |
| `get_agent_history` | Get everything an agent has done |
| `store_result` | Store the final output of a completed task |
| `handoff_task` | Record agent-to-agent handoff |

## Quick Start (NitroStack Server)

```bash
cd nitrostack-server
npm install
npm run dev
```

## Testing

```bash
cd nitrostack-server
npx tsx test.ts
```

## Deployment

```bash
cd nitrostack-server
npx tsc
node dist/index.js
```
