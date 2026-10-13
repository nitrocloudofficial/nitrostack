import { ControllerDecorator as Controller, ToolDecorator as Tool, Widget, z } from '@nitrostack/core';
import { WorkflowStateService } from './workflow-state.service.js';

@Controller('orchestrator')
export class OrchestratorTools {
  constructor(private readonly workflows: WorkflowStateService) {}

  @Tool({
    name: 'get_factory_dashboard',
    description: 'Load FactoryBrain workflow state for the combined six-widget operations dashboard.',
    inputSchema: z.object({ workflowId: z.string().optional() }),
  })
  @Widget('factory-dashboard')
  async getFactoryDashboard(input: { workflowId?: string }) {
    const workflows = this.workflows.list();
    const workflow = input.workflowId
      ? workflows.find((candidate) => candidate.workflowId === input.workflowId)
      : workflows.at(-1);
    return { workflow: workflow ?? null, workflows };
  }
}
