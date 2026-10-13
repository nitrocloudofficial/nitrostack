import { BaseAgent } from '../../shared/abstracts/BaseAgent.abstract.js';
import { AgentType } from '../../shared/enums/agent.enum.js';
import { AgentResponse } from '../../shared/interfaces/AgentResponse.interface.js';
import { Message } from '../../shared/interfaces/Message.interface.js';
import { ConnectorManagerService } from '../../services/ConnectorManager.service.js';
import { AgentEventBusService } from '../../services/AgentEventBus.service.js';
import { AgentHealthMonitorService } from '../../services/AgentHealthMonitor.service.js';

export class CollectorAgent extends BaseAgent<void, Message[]> {
  public readonly name = 'CollectorAgent';
  public readonly type = AgentType.COLLECTOR;
  public readonly description = 'Harvests messages across integrated platforms via ConnectorManager';

  private connectorManager: ConnectorManagerService;
  private eventBus: AgentEventBusService;
  private healthMonitor: AgentHealthMonitorService;

  constructor() {
    super();
    this.connectorManager = ConnectorManagerService.getInstance();
    this.eventBus = AgentEventBusService.getInstance();
    this.healthMonitor = AgentHealthMonitorService.getInstance();
  }

  public async execute(): Promise<AgentResponse<Message[]>> {
    const startTime = Date.now();
    try {
      this.eventBus.emit({ type: 'COLLECTION_STARTED', agentName: this.name, timestamp: new Date() });
      const messages = await this.connectorManager.fetchAllMessages();
      const duration = Date.now() - startTime;

      this.healthMonitor.recordExecution(this.name, duration, true);
      this.eventBus.emit({ type: 'COLLECTION_COMPLETED', agentName: this.name, timestamp: new Date(), executionTimeMs: duration });

      return this.createSuccessResponse(messages, duration, `Collected ${messages.length} cross-platform messages`);
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.healthMonitor.recordExecution(this.name, duration, false, errorMsg);
      return this.createErrorResponse(errorMsg, duration);
    }
  }
}
