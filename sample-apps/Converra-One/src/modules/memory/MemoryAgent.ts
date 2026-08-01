import { BaseAgent } from '../../shared/abstracts/BaseAgent.abstract.js';
import { AgentType } from '../../shared/enums/agent.enum.js';
import { AgentResponse } from '../../shared/interfaces/AgentResponse.interface.js';
import { Commitment } from '../../shared/interfaces/Commitment.interface.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { AgentHealthMonitorService } from '../../services/AgentHealthMonitor.service.js';

export interface MemoryAgentResult {
  commitments: Commitment[];
}

export class MemoryAgent extends BaseAgent<void, MemoryAgentResult> {
  public readonly name = 'MemoryAgent';
  public readonly type = AgentType.MEMORY;
  public readonly description = 'Tracks user commitments, promises, and cross-channel context across conversations';

  private healthMonitor: AgentHealthMonitorService;

  constructor() {
    super();
    this.healthMonitor = AgentHealthMonitorService.getInstance();
  }

  public async execute(): Promise<AgentResponse<MemoryAgentResult>> {
    const startTime = Date.now();
    try {
      const commitments: Commitment[] = [
        {
          id: 'cmt-01',
          sourceMessageId: 'msg-101',
          sourcePlatform: PlatformType.GMAIL,
          committedBy: 'Alex Mercer',
          committedTo: 'Dr. Evelyn Vance',
          statement: 'Review section 4.2 Raft parameters prior to 3:00 PM review call with Prof. Vance',
          dueDate: new Date('2026-07-25T15:00:00Z'),
          isFulfilled: false,
          detectedAt: new Date('2026-07-25T09:16:00Z')
        },
        {
          id: 'cmt-02',
          sourceMessageId: 'msg-102',
          sourcePlatform: PlatformType.SLACK,
          committedBy: 'Alex Mercer',
          committedTo: 'Sarah Chen',
          statement: 'Analyze heap snapshot from worker node 3 stress test with Sarah Chen',
          dueDate: new Date('2026-07-25T17:30:00Z'),
          isFulfilled: false,
          detectedAt: new Date('2026-07-25T10:05:00Z')
        }
      ];

      const duration = Date.now() - startTime;
      this.healthMonitor.recordExecution(this.name, duration, true);

      return this.createSuccessResponse({ commitments }, duration, `Tracked ${commitments.length} cross-channel commitments`);
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.healthMonitor.recordExecution(this.name, duration, false, errorMsg);
      return this.createErrorResponse(errorMsg, duration);
    }
  }
}
