import { Module } from '@nitrostack/core';
import { CommonModule } from '../../common/common.module.js';
import { RiskResources } from './risk.resources.js';
import { RiskTools } from './risk.tools.js';

@Module({
  name: 'risk',
  description: 'Deterministic credit scoring, reason codes and credit-limit recommendation',
  imports: [CommonModule],
  controllers: [RiskTools, RiskResources],
})
export class RiskModule {}
