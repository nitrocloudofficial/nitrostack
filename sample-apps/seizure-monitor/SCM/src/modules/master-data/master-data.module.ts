import { Module } from '@nitrostack/core';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { MasterDataService } from './master-data.service.js';
import { MasterDataTools } from './master-data.tools.js';
import { ErpAdapter } from './erp.adapter.js';
import { SqliteErpAdapter } from './sqlite-erp.adapter.js';

@Module({
  name: 'master-data',
  imports: [AnalyticsModule],  // provides shared DatabaseService + MigrationService
  providers: [
    { provide: ErpAdapter, useClass: SqliteErpAdapter },
    MasterDataService,
  ],
  controllers: [MasterDataTools], // MCP tool endpoints
  exports: [MasterDataService, MasterDataTools, ErpAdapter],
})
export class MasterDataModule {}
