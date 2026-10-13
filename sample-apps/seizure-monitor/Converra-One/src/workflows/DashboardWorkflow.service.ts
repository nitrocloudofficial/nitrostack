import { OrchestratorAgent } from '../modules/orchestrator/OrchestratorAgent.js';
import { DashboardData } from '../shared/interfaces/DashboardData.interface.js';

export class DashboardWorkflowService {
  private orchestrator: OrchestratorAgent;

  constructor() {
    this.orchestrator = new OrchestratorAgent();
  }

  public async getDashboardData(): Promise<DashboardData> {
    const result = await this.orchestrator.execute({ workflowName: 'DashboardWorkflow', triggerSource: 'USER_UI' });
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to execute DashboardWorkflow');
    }
    return result.data;
  }
}
