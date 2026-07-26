import { Module } from '@nitrostack/core';
import { HuntTechniqueTools } from './tools/perception/hunt-technique.js';
import { SpinTwinTools } from './tools/twin/spin-twin.js';
import { SimulateLateralMovementTools } from './tools/twin/simulate-lateral-movement.js';
import { TemporalReconstructionTools } from './tools/twin/temporal-reconstruction.js';
import { ExecutePreemptiveBlockTools } from './tools/action/execute-preemptive-block.js';
import { GenerateDecisionChainTools } from './tools/explainability/generate-decision-chain.js';
import { ThreatHunterResources } from './resources/threat-hunter.resources.js';
import { ThreatHunterPrompts } from './prompts/threat-hunter-persona.js';

@Module({
  name: 'threat-hunter',
  description: 'Autonomous threat hunting tools, resources, and persona for HUNT3R-T',
  controllers: [
    HuntTechniqueTools,
    SpinTwinTools,
    SimulateLateralMovementTools,
    TemporalReconstructionTools,
    ExecutePreemptiveBlockTools,
    GenerateDecisionChainTools,
    ThreatHunterResources,
    ThreatHunterPrompts,
  ],
})
export class ThreatHunterModule {}
