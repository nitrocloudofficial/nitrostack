import { Module } from '@nitrostack/core';
import { NeuroTwinService } from './neurotwin.service.js';
import { NeuroTwinTools } from './neurotwin.tools.js';
import { NeuroTwinTaskTools } from './neurotwin.tasks.js';
import { LogicRefactorAgent } from './agents/logic-refactor.agent.js';
import { ProtocolEvolverAgent } from './agents/protocol-evolver.agent.js';
import { NeuroTwinValidatorAgent } from './agents/neurotwin-validator.agent.js';
import { ResourceManagerAgent } from './agents/resource-manager.agent.js';
import { EthicalGuardrailAgent } from './agents/ethical-guardrail.agent.js';
import { NeuroTwinOrchestratorService } from './neurotwin-orchestrator.service.js';

@Module({
    name: 'neurotwin',
    description: 'Self-evolving industrial meta-agent: fleet twin, shift detection, mutation cycles, self-healing.',
    controllers: [NeuroTwinTools, NeuroTwinTaskTools],
    providers: [
        NeuroTwinService,
        LogicRefactorAgent,
        ProtocolEvolverAgent,
        NeuroTwinValidatorAgent,
        ResourceManagerAgent,
        EthicalGuardrailAgent,
        NeuroTwinOrchestratorService,
    ],
})
export class NeuroTwinModule { }
