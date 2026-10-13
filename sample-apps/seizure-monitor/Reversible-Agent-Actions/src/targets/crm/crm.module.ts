import { Module } from '@nitrostack/core';
import { CrmTools } from './crm.tools.js';

/**
 * @nitrostack/core never instantiates @Module-decorated classes (only their
 * static metadata is read at bootstrap), so registering CrmTools with the
 * compensator registry can't happen in a module constructor. See
 * CrmTools.onModuleInit (triggered from src/index.ts) for where that actually
 * happens.
 */
@Module({
  name: 'crm',
  description: 'CRM target server — accounts, tiers, API keys',
  controllers: [CrmTools],
  providers: [CrmTools],
})
export class CrmModule {}
