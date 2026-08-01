import { Module } from '@nitrostack/core';
import { AssignmentAgentPrompts } from '../../agent-2-assignment/assignment-agent.prompts.js';
import { AssignmentTools } from '../../agent-2-assignment/assignment.tools.js';
import { LegalAgentPrompts } from '../../agent-3-legal/legal-agent.prompts.js';
import { LegalTools } from '../../agent-3-legal/legal.tools.js';
import { FraudPipelineOrchestrator } from '../../orchestrator/pipeline.orchestrator.js';
import { TicketTools } from './ticket.tools.js';
import { TriageAgentPrompts } from './triage-agent.prompts.js';

@Module({
  name: 'fraud-pipeline',
  description: 'Fraud reporting pipeline MCP tools and prompts',
  controllers: [
    TicketTools,
    TriageAgentPrompts,
    AssignmentTools,
    AssignmentAgentPrompts,
    LegalTools,
    LegalAgentPrompts,
    FraudPipelineOrchestrator,
  ],
})
export class FraudPipelineModule {}
