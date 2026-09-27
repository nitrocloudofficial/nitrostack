import { Module } from '@nitrostack/core';
import { AetherCareTools } from './aethercare.tools.js';
import { AutonomousScraperTools } from './autonomous_scraper.tools.js';
import { MoERouterTools } from './moe_router.tools.js';
import { GeoEmpanelmentTools } from './geo_empanelment.tools.js';
import { PharmacyAndRebateTools } from './pharmacy_and_rebate.tools.js';
import { AgenticExecutionLoopTools } from './agentic_execution_loop.tools.js';
import { EnterpriseActionsTools } from './enterprise_actions.tools.js';
import { AetherCareResources } from './aethercare.resources.js';
import { AetherCarePrompts } from './aethercare.prompts.js';

@Module({
  name: 'aethercare',
  description: 'Agentic MoE Healthcare Navigator for Indian Healthcare System',
  controllers: [
    AetherCareTools,
    AutonomousScraperTools,
    MoERouterTools,
    GeoEmpanelmentTools,
    PharmacyAndRebateTools,
    AgenticExecutionLoopTools,
    EnterpriseActionsTools,
    AetherCareResources,
    AetherCarePrompts
  ]
})
export class AetherCareModule {}
