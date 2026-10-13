import { BaseAgent } from '../../shared/abstracts/BaseAgent.abstract.js';
import { AgentType } from '../../shared/enums/agent.enum.js';
import { AgentResponse } from '../../shared/interfaces/AgentResponse.interface.js';
import { Task } from '../../shared/interfaces/Task.interface.js';
import { TaskStatus } from '../../shared/enums/task.enum.js';
import { PriorityLevel } from '../../shared/enums/priority.enum.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { AgentHealthMonitorService } from '../../services/AgentHealthMonitor.service.js';

import { DemoStoreService } from '../../services/DemoStore.service.js';

export interface TaskAgentResult {
  tasks: Task[];
  extractedCount: number;
}

export class TaskAgent extends BaseAgent<unknown, TaskAgentResult> {
  public readonly name = 'TaskAgent';
  public readonly type = AgentType.TASK;
  public readonly description = 'Extracts action items, deliverables, and commitments into Task models';

  private healthMonitor: AgentHealthMonitorService;

  constructor() {
    super();
    this.healthMonitor = AgentHealthMonitorService.getInstance();
  }

  public async execute(): Promise<AgentResponse<TaskAgentResult>> {
    const startTime = Date.now();
    try {
      const demoStore = DemoStoreService.getInstance();
      const tasks = demoStore.getTasks();

      const duration = Date.now() - startTime;
      this.healthMonitor.recordExecution(this.name, duration, true);

      return this.createSuccessResponse(
        { tasks, extractedCount: tasks.length },
        duration,
        `Extracted ${tasks.length} action items`
      );
    } catch (err: unknown) {

      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.healthMonitor.recordExecution(this.name, duration, false, errorMsg);
      return this.createErrorResponse(errorMsg, duration);
    }
  }
}
