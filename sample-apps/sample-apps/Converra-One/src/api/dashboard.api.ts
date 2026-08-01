import { DashboardWorkflowService } from '../workflows/DashboardWorkflow.service.js';

export async function fetchDashboardData() {
  const service = new DashboardWorkflowService();
  return service.getDashboardData();
}
