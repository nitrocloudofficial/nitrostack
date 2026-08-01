# MCP Tasks Guide

The Model Context Protocol (MCP) Tasks specification enables **long-running, asynchronous operations** in MCP servers. Unlike standard tool calls, which are expected to return results within a few seconds, tasks allow for operations that might take minutes or even longer—such as data processing, heavy auditing, or multi-step human-in-the-loop workflows.

NitroStack provides a first-class implementation of MCP Tasks, handling the complex state management, polling, and notifications automatically so you can focus on your tool logic.

## Overview

A standard MCP tool call is synchronous: the client waits for the server to finish and send back a response. If the operation is slow, the transport (like SSE or STDIO) might time out, or the user interface might freeze.

**MCP Tasks solve this by:**
1. **Immediate Acceptance**: The server returns a `taskId` immediately.
2. **Asynchronous Execution**: The tool continues running in the background.
3. **Progress Reporting**: The server sends updates about what it's doing.
4. **Cooperative Cancellation**: Clients can cancel tasks mid-flight.
5. **Flexible Retrieval**: Results can be polled or retrieved via a blocking call once done.

---

## Configuration

To enable tasks for a tool, use the `taskSupport` option in the `@Tool` decorator.

### Task Support Levels

| Value | Behavior |
| :--- | :--- |
| `'forbidden'` | **(Default)** The tool cannot be called as a task. Sending a task request returns an error. |
| `'optional'` | The tool can be called normally (sync) OR as a task (async). |
| `'required'` | The tool **must** be called as a task. Normal calls return an error. |

### Example

```typescript
import { ToolDecorator as Tool, z } from '@nitrostack/core';

export class MyTools {
  @Tool({
    name: 'heavy_audit',
    description: 'Performs a complex system audit',
    inputSchema: z.object({ level: z.string() }),
    taskSupport: 'optional' // Can run as a task or sync
  })
  async audit(args: any, ctx: ExecutionContext) {
    // ... logic ...
  }
}
```

---

## Implementation

When a tool is invoked as a task, NitroStack populates `ctx.task` in the `ExecutionContext`. Use this object to interact with the task lifecycle.

### Reporting Progress

Keep the user informed by sending status messages during execution.

```typescript
@Tool({ name: 'import_data', taskSupport: 'required' })
async importData(args: any, ctx: ExecutionContext) {
  if (ctx.task) {
    ctx.task.updateProgress('Connecting to database...');
    // ... work ...
    ctx.task.updateProgress('Scanning records...');
    // ... work ...
    ctx.task.updateProgress('Processing batch 1 of 10...');
  }
  return { imported: 100 };
}
```

### Requesting Input

If the task requires human feedback (e.g., "Confirm delete?" or "Provide API key"), transition the task to the `input_required` state.

```typescript
ctx.task.requestInput('System detected a conflict. Should we overwrite? (yes/no)');
```

### Supporting Cancellation

Tasks can be cancelled by the client. Well-behaved tools check for cancellation periodically and clean up resources.

```typescript
for (const item of items) {
  // Throws a TaskCancelledError if client requested cancellation
  ctx.task?.throwIfCancelled();
  
  // Or check boolean for manual cleanup
  if (ctx.task?.isCancelled) {
    await this.cleanup();
    ctx.task.throwIfCancelled();
  }

  await this.process(item);
}
```

---

## Client Usage

Clients that support MCP Tasks follow a refined protocol flow.

### 1. Initiating a Task

Clients add a `task: {}` parameter to the `tools/call` request.

```json
{
  "method": "tools/call",
  "params": {
    "name": "heavy_audit",
    "arguments": { "level": "full" },
    "task": { "ttl": 300000 }
  }
}
```

**Server Response (Immediate):**
```json
{
  "task": {
    "taskId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "working",
    "pollInterval": 2000
  }
}
```

### 2. Monitoring Status

Clients can poll for updates using `tasks/get`.

```json
{
  "method": "tasks/get",
  "params": { "taskId": "f47ac10b..." }
}
```

**Response:**
```json
{
  "taskId": "f47ac10b...",
  "status": "working",
  "statusMessage": "Processing batch 1 of 10...",
  "lastUpdatedAt": "2024-01-01T12:00:05Z"
}
```

### 3. Retrieving Results

The `tasks/result` method blocks until the task reaches a terminal state (`completed`, `failed`, or `cancelled`).

```json
{
  "method": "tasks/result",
  "params": { "taskId": "f47ac10b..." }
}
```

---

## Complete Example: Batch Quality Audit

This example demonstrates a tool that audits multiple records, provides progress updates, and supports cancellation.

```typescript
import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { AuditService } from './audit.service.js';

@Injectable({ deps: [AuditService] })
export class AuditTools {
  constructor(private readonly auditService: AuditService) {}

  @Tool({
    name: 'run_batch_audit',
    description: 'Audits a batch of resource records for compliance.',
    taskSupport: 'optional',
    inputSchema: z.object({
      batchId: z.string(),
      checkDepth: z.enum(['shallow', 'deep']).default('shallow')
    })
  })
  async runAudit(args: any, ctx: ExecutionContext) {
    const records = await this.auditService.getBatch(args.batchId);
    const results = [];

    ctx.logger.info(`Starting audit for batch ${args.batchId}`);

    for (let i = 0; i < records.length; i++) {
      // Step 1: Check for cancellation
      ctx.task?.throwIfCancelled();

      // Step 2: Update progress
      ctx.task?.updateProgress(`Auditing record ${i + 1} of ${records.length}...`);

      // Step 3: Perform work
      const result = await this.auditService.checkRecord(records[i], args.checkDepth);
      results.push(result);
    }

    return {
      batchId: args.batchId,
      totalAudited: records.length,
      complianceScore: this.calculateScore(results)
    };
  }

  private calculateScore(results: any[]): number {
    // ... scoring logic ...
    return 95;
  }
}
```

## Best Practices

1. **Check for Cancellation**: Always call `ctx.task.throwIfCancelled()` inside loops or before expensive operations.
2. **Granular Updates**: Send progress messages frequently enough to be helpful, but avoid excessive noise (e.g., every 1-2 seconds is usually ideal).
3. **Handle Sync Fallback**: If `taskSupport` is `'optional'`, ensure your tool works correctly even when `ctx.task` is undefined (i.e., it runs synchronously).
4. **Use Timeouts**: Servers automatically clean up tasks after their TTL (Time To Live). Default TTL is 5 minutes unless specified by the client.
