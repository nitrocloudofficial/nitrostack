import {
  McpApp,
  Module,
  CodeModeTransform,
  DEFAULT_CODE_MODE_SEARCH_DESCRIPTION,
} from '@nitrostack/core';
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
      searchToolDescription: DEFAULT_CODE_MODE_SEARCH_DESCRIPTION,
      alwaysVisible: [
        'finance_get_financial_summary',
        'finance_audit_ledger',
        'inventory_check_stock',
        'inventory_report',
        'support_get_system_status',
        'data_aggregate_sum',
      ],
    }),
  ],
})
@Module({
  name: 'app',
  description: 'Code Mode service with QuickJS WebAssembly sandboxing',
  controllers: [DataController, InventoryController, FinanceController, SupportController],
})
export class AppModule {}
