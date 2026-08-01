import { DashboardWorkflowService } from '../workflows/DashboardWorkflow.service.js';

export const getDailyBriefingTool = {
  name: 'getDailyBriefing',
  description: 'Returns AI-synthesized morning briefing and key action items',
  execute: async () => {
    const service = new DashboardWorkflowService();
    const data = await service.getDashboardData();
    return {
      greeting: 'Good Morning, Alex',
      summary: 'Priority Agent scored 2 urgent threads. 1 calendar conflict auto-resolved.',
      metrics: data.metrics
    };
  }
};
