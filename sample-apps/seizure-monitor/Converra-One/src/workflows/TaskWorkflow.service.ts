import { TaskAgent } from '../modules/task/TaskAgent.js';
import { Task } from '../shared/interfaces/Task.interface.js';

export class TaskWorkflowService {
  private taskAgent: TaskAgent;

  constructor() {
    this.taskAgent = new TaskAgent();
  }

  public async extractTasksFromMessages(): Promise<Task[]> {
    const response = await this.taskAgent.execute();
    return response.data?.tasks || [];
  }
}
