import { ControllerDecorator as Controller, ToolDecorator as Tool, Widget, z } from '@nitrostack/core';
import { DatabaseService } from '../../services/database.service.js';
import { QueueService } from '../../services/queue.service.js';
import { NotificationRealtimeService } from '../notification/notification-realtime.service.js';
import { DurationRulesService } from './duration-rules.service.js';
import { MonitoringAgent } from './monitoring.agent.js';
import { externalStatusSchema, trackingInputSchema } from './monitoring.schemas.js';
import { MockStatusService } from './mock-status.service.js';

@Controller('monitoring')
export class MonitoringTools {
  private readonly agent: MonitoringAgent;
  private readonly database: DatabaseService;
  private readonly sources: MockStatusService;
  private readonly ready: Promise<void>;

  constructor(agent?: MonitoringAgent, database?: DatabaseService, sources?: MockStatusService) {
    if (agent && database && sources) {
      this.agent = agent; this.database = database; this.sources = sources; this.ready = Promise.resolve(); return;
    }
    const resolvedDatabase = new DatabaseService();
    this.database = resolvedDatabase;
    const queue = new QueueService(resolvedDatabase);
    queue.registerHandler('manager', 'workflow_status', async () => {});
    this.sources = new MockStatusService();
    const resolvedAgent = new MonitoringAgent(resolvedDatabase, queue, new DurationRulesService(), this.sources, new NotificationRealtimeService(resolvedDatabase));
    this.agent = resolvedAgent;
    this.ready = (async () => { await resolvedDatabase.onModuleInit(); await resolvedAgent.onModuleInit(); })();
  }
  @Tool({ name: 'track_workflow', description: 'Start tracking an approved and notified FactoryBrain plan.', inputSchema: trackingInputSchema })
  @Widget('factory-kpi') async trackWorkflow(input: any) { await this.ready; return this.agent.trackWorkflow(input); }
  @Tool({ name: 'record_workflow_status', description: 'Normalize and apply a procurement, maintenance, or machine status event.', inputSchema: externalStatusSchema })
  async recordStatus(input: z.infer<typeof externalStatusSchema>) { await this.ready; return this.agent.handleStatus(input); }
  @Tool({ name: 'poll_workflows', description: 'Poll mocked sources and detect stalled workflow stages.', inputSchema: z.object({}) })
  async poll() { await this.ready; await this.agent.poll(); return this.database.listMonitoringWorkflows(); }
  @Tool({ name: 'queue_mock_status', description: 'Queue a mock procurement, maintenance, or machine status for the next poll.', inputSchema: externalStatusSchema })
  async queueMockStatus(input: z.infer<typeof externalStatusSchema>) { await this.ready; this.sources.set(input); return { queued: true }; }
  @Tool({ name: 'list_monitored_workflows', description: 'List live workflow stages, deadlines, and completion state.', inputSchema: z.object({}) })
  @Widget('factory-kpi') async listWorkflows() { await this.ready; return this.database.listMonitoringWorkflows(); }
  @Tool({ name: 'list_monitoring_alerts', description: 'List stalled-stage alerts.', inputSchema: z.object({ workflowId: z.string().optional() }) })
  async listAlerts(input: { workflowId?: string }) { await this.ready; return this.database.listMonitoringAlerts(input.workflowId); }
  @Tool({ name: 'list_workflow_agent_events', description: 'List persisted workflow stage changes.', inputSchema: z.object({ workflowId: z.string().optional() }) })
  async listEvents(input: { workflowId?: string }) { await this.ready; return this.database.listMonitoringEvents(input.workflowId); }
}
