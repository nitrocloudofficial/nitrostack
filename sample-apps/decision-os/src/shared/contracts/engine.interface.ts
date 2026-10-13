import { DecisionContext } from './decision-context.js';
import { StandardEngineOutput } from '../types/standard-engine-output.js';

export interface EngineMetadata {
  engineId: string;
  capabilities: string[];
  supportedDomains: string[];
  requiredInputs: string[];
  producedOutputs: string[];
  executionPriority: number;
  dependencies: string[];
  parallelExecutionCapability: boolean;
  version: string;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
}

export interface EngineRequest {
  executionId: string;
  context: DecisionContext;
  upstreamResults?: Record<string, StandardEngineOutput>;
}

export interface IEnginePlugin {
  getMetadata(): EngineMetadata;
  execute(request: EngineRequest): Promise<StandardEngineOutput>;
}
