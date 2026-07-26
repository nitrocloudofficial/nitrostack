---
name: langgraph-orchestrator
description: LangGraph State Machine Standard
---
# LangGraph State Machine Standard
In `apps/orchestrator/`:
- Keep `GraphState` immutable. Every node must return partial state updates.
- Always include an error boundary node to catch failing MCP tool calls gracefully.
- Ensure state transitions use explicit conditional edges checking `state.status === 'APPROVED'`.
