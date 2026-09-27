import { Module } from '@nitrostack/core';
import { CareTools } from './care.tools.js';
import { CareService } from './care.service.js';
import { IntegrationsModule } from '../../integrations/integrations.module.js';

@Module({
  name: 'care',
  description: 'Care Coordination module — SBAR handoffs, med reconciliation, referrals, guidelines, appointment prep',
  imports: [IntegrationsModule],
  controllers: [CareTools],
  providers: [CareService],
  exports: [CareService],
})
export class CareModule {}
