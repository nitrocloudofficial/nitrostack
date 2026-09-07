import { Module } from '@nitrostack/core';
import { RiskService } from './risk.service.js';
import { RiskResource } from './risk.resource.js';
import { RiskTools } from './risk.tools.js';
import { DbModule } from '../db/db.module.js';

/**
 * RiskModule — risk analysis and position limits
 */
@Module({
  name: 'risk',
  description: 'Portfolio risk, value at risk, drawdowns, and limits monitoring',
  imports: [DbModule],
  providers: [RiskService],
  controllers: [RiskResource, RiskTools],
  exports: [RiskService, RiskResource, RiskTools]
})
export class RiskModule {}
