import { Injectable } from '@nitrostack/core';
import { LogicRefactorAgent, UnitTelemetry, MutationProposal } from './agents/logic-refactor.agent.js';
import { ProtocolEvolverAgent, CommsHealthReading, TopologyDecision } from './agents/protocol-evolver.agent.js';
import { NeuroTwinValidatorAgent, ValidationResult } from './agents/neurotwin-validator.agent.js';
import { ResourceManagerAgent, DomainResourceSnapshot, ResourceCommand } from './agents/resource-manager.agent.js';
import { EthicalGuardrailAgent, EthicalCheckResult } from './agents/ethical-guardrail.agent.js';
import { MissionControlAgent } from './agents/mission-control.agent.js';

export interface PipelineStageTrail {
    stage: 'resource-command' | 'proposal' | 'validation' | 'ethical-check' | 'deploy-decision';
    detail: ResourceCommand | MutationProposal | ValidationResult | EthicalCheckResult | { deployed: boolean; note: string };
}

export interface PipelineResult {
    unitId: string;
    trail: PipelineStageTrail[];
    finalStatus: 'deployed' | 'rejected';
}

@Injectable({ deps: [LogicRefactorAgent, ProtocolEvolverAgent, NeuroTwinValidatorAgent, ResourceManagerAgent, EthicalGuardrailAgent, MissionControlAgent] })
export class NeuroTwinOrchestratorService {
    constructor(
        private readonly logicRefactor: LogicRefactorAgent,
        private readonly protocolEvolver: ProtocolEvolverAgent,
        private readonly validator: NeuroTwinValidatorAgent,
        private readonly resourceManager: ResourceManagerAgent,
        private readonly ethicalGuardrail: EthicalGuardrailAgent,
        private readonly missionControl: MissionControlAgent,
    ) {}

    /**
     * Runs the full pipeline for a single unit:
     * ResourceManager -> LogicRefactor -> Validator (safety) -> EthicalGuardrail (fairness) -> deploy/reject.
     * fleetContext is every unit's telemetry, used by EthicalGuardrail to check equity across peers.
     */
    runMutationPipeline(
        telemetry: UnitTelemetry,
        resourceSnapshot: DomainResourceSnapshot,
        fleetContext: UnitTelemetry[] = [],
    ): PipelineResult {
        const trail: PipelineStageTrail[] = [];

        const command = this.resourceManager.evaluateDomain(resourceSnapshot);
        trail.push({ stage: 'resource-command', detail: command });

        const proposal = this.logicRefactor.proposeMutation(telemetry);
        trail.push({ stage: 'proposal', detail: proposal });

        const validation = this.validator.validate(telemetry, proposal);
        trail.push({ stage: 'validation', detail: validation });

        const ethicalCheck = this.ethicalGuardrail.evaluate(telemetry, proposal, fleetContext);
        trail.push({ stage: 'ethical-check', detail: ethicalCheck });

        const deployed = validation.approved && ethicalCheck.approved;
        trail.push({
            stage: 'deploy-decision',
            detail: {
                deployed,
                note: deployed
                    ? `Mutation "${proposal.strategyName}" approved (safety + fairness) and deployed to ${telemetry.unitId}.`
                    : `Mutation rejected - safety violations: [${validation.violatedRules.join(', ')}], fairness concerns: [${ethicalCheck.flaggedConcerns.join(', ')}].`,
            },
        });

        return {
            unitId: telemetry.unitId,
            trail,
            finalStatus: deployed ? 'deployed' : 'rejected',
        };
    }

    evaluateSwarmComms(readings: CommsHealthReading[]): TopologyDecision | null {
        return this.protocolEvolver.evaluateSwarmHealth(readings);
    }

    getCurrentTopology() {
        return this.protocolEvolver.getCurrentTopology();
    }

    runMission(goal: string, unitIds?: string[]) {
        return this.missionControl.runMission(goal, unitIds);
    }
}

