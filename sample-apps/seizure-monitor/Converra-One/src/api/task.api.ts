import { TaskWorkflowService } from '../workflows/TaskWorkflow.service.js';

export async function fetchExtractedTasks() {
  const service = new TaskWorkflowService();
  return service.extractTasksFromMessages();
}
