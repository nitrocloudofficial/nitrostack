import { TaskWorkflowService } from '../workflows/TaskWorkflow.service.js';

export const extractTasksTool = {
  name: 'extractTasks',
  description: 'Extracts actionable deliverables and commitments from messages',
  execute: async () => {
    const service = new TaskWorkflowService();
    return service.extractTasksFromMessages();
  }
};
