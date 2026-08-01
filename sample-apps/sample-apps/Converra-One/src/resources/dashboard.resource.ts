import { DashboardWorkflowService } from '../workflows/DashboardWorkflow.service.js';

export const dashboardResource = {
  uri: 'resource://dashboard/current',
  name: 'Current Dashboard Data',
  description: 'Aggregated dashboard metrics, priority messages, tasks, and schedule',
  read: async () => {
    const service = new DashboardWorkflowService();
    return service.getDashboardData();
  }
};
