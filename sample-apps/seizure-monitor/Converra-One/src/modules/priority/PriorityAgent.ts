import { BaseAgent } from '../../shared/abstracts/BaseAgent.abstract.js';
import { AgentType } from '../../shared/enums/agent.enum.js';
import { AgentResponse } from '../../shared/interfaces/AgentResponse.interface.js';
import { Message } from '../../shared/interfaces/Message.interface.js';
import { PriorityLevel } from '../../shared/enums/priority.enum.js';
import { AgentHealthMonitorService } from '../../services/AgentHealthMonitor.service.js';

export interface PriorityAgentResult {
  scoredMessages: Message[];
  urgentCount: number;
}

export class PriorityAgent extends BaseAgent<Message[], PriorityAgentResult> {
  public readonly name = 'PriorityAgent';
  public readonly type = AgentType.PRIORITY;
  public readonly description = 'Scores messages for urgency and priority classification';

  private healthMonitor: AgentHealthMonitorService;

  constructor() {
    super();
    this.healthMonitor = AgentHealthMonitorService.getInstance();
  }

  public async execute(messages: Message[]): Promise<AgentResponse<PriorityAgentResult>> {
    const startTime = Date.now();
    try {
      const scoredMessages = messages.map((m) => {
        let priority = m.priority;
        if (m.subject?.toLowerCase().includes('urgent') || m.content.toLowerCase().includes('urgent')) {
          priority = PriorityLevel.URGENT;
        }
        return { ...m, priority };
      });

      const urgentCount = scoredMessages.filter(m => m.priority === PriorityLevel.URGENT).length;
      const duration = Date.now() - startTime;

      this.healthMonitor.recordExecution(this.name, duration, true);
      return this.createSuccessResponse({ scoredMessages, urgentCount }, duration, `Scored ${messages.length} messages (${urgentCount} urgent)`);
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.healthMonitor.recordExecution(this.name, duration, false, errorMsg);
      return this.createErrorResponse(errorMsg, duration);
    }
  }
}
