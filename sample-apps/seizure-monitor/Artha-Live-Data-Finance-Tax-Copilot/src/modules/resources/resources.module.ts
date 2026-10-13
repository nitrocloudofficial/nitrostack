import { Module } from '@nitrostack/core';
import { FundsModule } from '../funds/funds.module.js';
import { FinanceResources } from './resources.controller.js';

/**
 * Resources module — read-only MCP @Resource endpoints (the third MCP primitive).
 * Imports FundsModule so the live market-snapshot resource can fetch current NAVs.
 */
@Module({
    name: 'resources',
    description: 'Reference + live MCP resources (tax law, calendar, fund map, data provenance, methodology, live market snapshot)',
    imports: [FundsModule],
    controllers: [FinanceResources],
})
export class ResourcesModule { }
