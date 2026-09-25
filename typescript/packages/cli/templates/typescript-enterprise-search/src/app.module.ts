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
    }),
  ],
})
@Module({
  name: 'app',
  description: 'Enterprise MCP service optimized with BM25 progressive tool discovery',
  controllers: [FinanceController, InventoryController, SupportController],
})
export class AppModule {}
