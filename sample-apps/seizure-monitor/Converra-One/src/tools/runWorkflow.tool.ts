import { DashboardWorkflowService } from '../workflows/DashboardWorkflow.service.js';

export const runWorkflowTool = {
  name: 'runWorkflow',
  description: 'Triggers the full end-to-end multi-agent orchestration pipeline',
  execute: async () => {
    const service = new DashboardWorkflowService();
    return service.getDashboardData();
  }
};
