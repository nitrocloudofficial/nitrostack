import { McpApp } from '@nitrostack/core';
import { BM25SearchTransform } from '@nitrostack/core/transforms';
import { FinanceController } from './controllers/finance.controller.js';
import { InventoryController } from './controllers/inventory.controller.js';
import { SupportController } from './controllers/support.controller.js';

@McpApp({
  name: 'enterprise-search-service',
  version: '1.0.0',
  description: 'Enterprise MCP service optimized with BM25 progressive tool discovery',
  controllers: [FinanceController, InventoryController, SupportController],
  transforms: [
    new BM25SearchTransform({
      defaultLimit: 5,
      alwaysVisible: ['support_auth_login', 'support_get_system_status'],
    }),
  ],
})
export class EnterpriseSearchApp {}
