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
      alwaysVisible: ['support_auth_login', 'support_get_system_status'],
      searchToolDescription:
        'Searches available tools by natural language query or keywords. CRITICAL: You only have a minimal initial tool catalog loaded. Whenever the user requests any task, calculation, inventory action, ticket, or domain operation (such as finance, tax, payroll, inventory, stock, or customer support) that is not in your immediate catalog, you MUST call this tool first to discover and inspect the required tool before answering. Never decline a user request without searching first. Returns matching tool names, descriptions, and parameter schemas.',
    }),
  ],
})
@Module({
  name: 'app',
  description: 'Enterprise MCP service optimized with BM25 progressive tool discovery',
  controllers: [FinanceController, InventoryController, SupportController],
})
export class AppModule {}
