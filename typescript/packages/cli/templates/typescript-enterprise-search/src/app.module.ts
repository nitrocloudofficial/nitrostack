import { McpApp, Module, BM25SearchTransform } from '@nitrostack/core';
import { FinanceController } from './controllers/finance.controller.js';
import { InventoryController } from './controllers/inventory.controller.js';
import { SupportController } from './controllers/support.controller.js';

/**
 * Root Application Module
 *
 * BM25SearchTransform hides the catalog behind `search_tools` and `call_tool`.
 * Controller prefixes apply, so `@Controller('support')` + `auth_login` is
 * listed as `support_auth_login`.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'enterprise-search-service',
    version: '1.0.0',
  },
  transforms: [
    new BM25SearchTransform({
      defaultLimit: 5,
      alwaysVisible: [
        'support_auth_login',
        'support_get_system_status',
        'finance_get_financial_summary',
        'inventory_report',
      ],
      searchToolDescription:
        'Searches available tools by keywords or a natural language description of the task. ' +
        'For a specific task (for example finance, tax, payroll, inventory, stock, or customer support), ' +
        'call it with task keywords to get the matching tool and its parameters before answering. ' +
        'If the user asks what you can do or wants to see the tools, call it with no query to get a brief index of every available tool. ' +
        'Never decline a request without searching first.',
    }),
  ],
})
@Module({
  name: 'app',
  description: 'Enterprise MCP service optimized with BM25 progressive tool discovery',
  controllers: [FinanceController, InventoryController, SupportController],
})
export class AppModule {}
