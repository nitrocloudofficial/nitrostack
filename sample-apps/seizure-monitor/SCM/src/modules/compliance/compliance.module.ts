import { Module } from '@nitrostack/core';
import { ComplianceService } from './compliance.service.js';
import { ComplianceTools } from './compliance.tools.js';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { MasterDataModule } from '../master-data/master-data.module.js';

@Module({
  name: 'compliance',
  imports: [AnalyticsModule, MasterDataModule], // for DatabaseService and ErpAdapter
  providers: [ComplianceService],
  controllers: [ComplianceTools],
  exports: [ComplianceService, ComplianceTools],
})
export class ComplianceModule {}
