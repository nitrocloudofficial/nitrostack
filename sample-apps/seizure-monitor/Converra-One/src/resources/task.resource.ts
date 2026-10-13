import { TaskWorkflowService } from '../workflows/TaskWorkflow.service.js';

export const taskResource = {
  uri: 'resource://tasks/today',
  name: "Today's Extracted Tasks",
  description: 'Extracted deliverables, action items, and pending commitments',
  read: async () => {
    const service = new TaskWorkflowService();
    return service.extractTasksFromMessages();
  }
};
