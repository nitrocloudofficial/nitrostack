import { Module, ConfigModule } from '@nitrostack/core';
import { TxnModule } from './txn/txn.module.js';
import { CrmModule } from './targets/crm/crm.module.js';
import { MessagingModule } from './targets/messaging/messaging.module.js';
import { BillingModule } from './targets/billing/billing.module.js';

// @McpApp lives on Application (src/index.ts), which points its `module` option
// back at this class — McpApplicationFactory reads @Module metadata from
// wherever that option points, not from the class @McpApp itself decorates.
@Module({
  name: 'root',
  description: 'Reversible Agent Actions MCP Server',
  imports: [ConfigModule.forRoot(), TxnModule, CrmModule, MessagingModule, BillingModule],
})
export class AppModule {}
