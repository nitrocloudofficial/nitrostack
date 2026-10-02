import { McpApp, Module, CodeModeTransform } from '@nitrostack/core';
import { DataController } from './controllers/data.controller.js';
import { InventoryController } from './controllers/inventory.controller.js';
import { FinanceController } from './controllers/finance.controller.js';
import { SupportController } from './controllers/support.controller.js';

/**
 * Root Application Module
 *
 * CodeModeTransform replaces the tool catalog with `search`, `get_schema`, and
 * `execute`. The model writes one script that calls the data tools inside a
 * QuickJS WebAssembly sandbox (see src/scripts/sample-batch.js).
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'code-mode-service',
    version: '1.0.0',
  },
  transforms: [
    new CodeModeTransform({
      workerPoolSize: 4,
      memoryLimitMb: 128,
      timeoutMs: 15000,
      searchToolDescription:
        'Searches available tools using natural language query or keywords. CRITICAL: Only a minimal tool set is visible initially. When the user asks for any capability not in your current tools, you MUST call search first to discover tools, then get_schema, then execute. Never decline without searching. Returns tool names and brief summaries.',
    }),
  ],
})
@Module({
  name: 'app',
  description: 'Code Mode service with QuickJS WebAssembly sandboxing',
  controllers: [DataController, InventoryController, FinanceController, SupportController],
})
export class AppModule {}
