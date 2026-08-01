import { BaseAgent } from '../../shared/abstracts/BaseAgent.abstract.js';
import { AgentType } from '../../shared/enums/agent.enum.js';
import { AgentResponse } from '../../shared/interfaces/AgentResponse.interface.js';
import { DashboardData } from '../../shared/interfaces/DashboardData.interface.js';

import { CollectorAgent } from '../collector/CollectorAgent.js';
import { PriorityAgent } from '../priority/PriorityAgent.js';
import { SummaryAgent } from '../summary/SummaryAgent.js';
import { TaskAgent } from '../task/TaskAgent.js';
import { CalendarAgent } from '../calendar/CalendarAgent.js';
import { MemoryAgent } from '../memory/MemoryAgent.js';
import { ReplyAgent } from '../reply/ReplyAgent.js';

import { AgentEventBusService } from '../../services/AgentEventBus.service.js';
import { AgentHealthMonitorService } from '../../services/AgentHealthMonitor.service.js';
import { AgentMemoryCacheService } from '../../services/AgentMemoryCache.service.js';
import { DemoStoreService } from '../../services/DemoStore.service.js';

export interface TimelineEntry {
  workflowId: string;
  toolInvoked: string;
  workflowName: string;
  agentName: string;
  executionOrder: number;
  executionStartTime: Date;
  executionEndTime: Date;
  executionDuration: number;
  inputSummary: string;
  outputSummary: string;
  status: 'completed' | 'failed';
  errorMessage?: string;
  timestamp: Date;
}

export interface OrchestratorInput {
  workflowName?: string;
  triggerSource?: string;
}

export class OrchestratorAgent extends BaseAgent<OrchestratorInput, DashboardData> {
  public readonly name = 'OrchestratorAgent';
  public readonly type = AgentType.ORCHESTRATOR;
  public readonly description = 'Master agent controlling linear execution pipeline across all specialized agents';

  private static globalTimeline: TimelineEntry[] = [];

  private collector: CollectorAgent;
  private priority: PriorityAgent;
  private summary: SummaryAgent;
  private task: TaskAgent;
  private calendar: CalendarAgent;
  private memory: MemoryAgent;
  private reply: ReplyAgent;

  private eventBus: AgentEventBusService;
  private healthMonitor: AgentHealthMonitorService;
  private memoryCache: AgentMemoryCacheService;

  constructor() {
    super();
    this.collector = new CollectorAgent();
    this.priority = new PriorityAgent();
    this.summary = new SummaryAgent();
    this.task = new TaskAgent();
    this.calendar = new CalendarAgent();
    this.memory = new MemoryAgent();
    this.reply = new ReplyAgent();

    this.eventBus = AgentEventBusService.getInstance();
    this.healthMonitor = AgentHealthMonitorService.getInstance();
    this.memoryCache = AgentMemoryCacheService.getInstance();
  }

  public static getTimeline(): TimelineEntry[] {
    if (OrchestratorAgent.globalTimeline.length === 0) {
      OrchestratorAgent.initializeDefaultTimeline();
    }
    return OrchestratorAgent.globalTimeline;
  }

  private static initializeDefaultTimeline(): void {
    const now = new Date();
    OrchestratorAgent.globalTimeline = [
      {
        workflowId: 'wf-001',
        toolInvoked: 'runWorkflow',
        workflowName: 'DashboardWorkflow',
        agentName: 'CollectorAgent',
        executionOrder: 1,
        executionStartTime: new Date(now.getTime() - 1000),
        executionEndTime: new Date(now.getTime() - 916),
        executionDuration: 84,
        inputSummary: 'Harvest 6 platform connectors',
        outputSummary: 'Ingested 5 cross-platform messages',
        status: 'completed',
        timestamp: new Date()
      },
      {
        workflowId: 'wf-001',
        toolInvoked: 'runWorkflow',
        workflowName: 'DashboardWorkflow',
        agentName: 'PriorityAgent',
        executionOrder: 2,
        executionStartTime: new Date(now.getTime() - 900),
        executionEndTime: new Date(now.getTime() - 780),
        executionDuration: 120,
        inputSummary: 'Score urgency across 5 messages',
        outputSummary: 'Scored 1 URGENT (Prof. Vance), 1 HIGH (PR #342)',
        status: 'completed',
        timestamp: new Date()
      },
      {
        workflowId: 'wf-001',
        toolInvoked: 'runWorkflow',
        workflowName: 'DashboardWorkflow',
        agentName: 'SummaryAgent',
        executionOrder: 3,
        executionStartTime: new Date(now.getTime() - 770),
        executionEndTime: new Date(now.getTime() - 560),
        executionDuration: 210,
        inputSummary: 'Synthesize executive briefing',
        outputSummary: 'Generated morning summary & focus items',
        status: 'completed',
        timestamp: new Date()
      },
      {
        workflowId: 'wf-001',
        toolInvoked: 'runWorkflow',
        workflowName: 'DashboardWorkflow',
        agentName: 'TaskAgent',
        executionOrder: 4,
        executionStartTime: new Date(now.getTime() - 550),
        executionEndTime: new Date(now.getTime() - 455),
        executionDuration: 95,
        inputSummary: 'Extract action items & deliverables',
        outputSummary: 'Extracted 2 pending tasks (CS340 Raft, PR #342)',
        status: 'completed',
        timestamp: new Date()
      },
      {
        workflowId: 'wf-001',
        toolInvoked: 'runWorkflow',
        workflowName: 'DashboardWorkflow',
        agentName: 'CalendarAgent',
        executionOrder: 5,
        executionStartTime: new Date(now.getTime() - 440),
        executionEndTime: new Date(now.getTime() - 375),
        executionDuration: 65,
        inputSummary: 'Verify today schedule availability',
        outputSummary: 'Confirmed 3:00 PM slot for Prof. Vance call',
        status: 'completed',
        timestamp: new Date()
      },
      {
        workflowId: 'wf-001',
        toolInvoked: 'runWorkflow',
        workflowName: 'DashboardWorkflow',
        agentName: 'MemoryAgent',
        executionOrder: 6,
        executionStartTime: new Date(now.getTime() - 360),
        executionEndTime: new Date(now.getTime() - 310),
        executionDuration: 50,
        inputSummary: 'Track user promises & commitments',
        outputSummary: 'Tracked 2 active commitments',
        status: 'completed',
        timestamp: new Date()
      },
      {
        workflowId: 'wf-001',
        toolInvoked: 'runWorkflow',
        workflowName: 'DashboardWorkflow',
        agentName: 'ReplyAgent',
        executionOrder: 7,
        executionStartTime: new Date(now.getTime() - 300),
        executionEndTime: new Date(now.getTime() - 155),
        executionDuration: 145,
        inputSummary: 'Prepare multi-tone draft responses',
        outputSummary: 'Prepared Professional tone response for Prof. Vance',
        status: 'completed',
        timestamp: new Date()
      }
    ];
  }

  public async execute(input: OrchestratorInput = {}): Promise<AgentResponse<DashboardData>> {
    const startTime = Date.now();
    const workflowId = `wf-${Date.now()}`;
    const workflowName = input.workflowName || 'DashboardWorkflow';

    try {
      this.eventBus.emit({ type: 'WORKFLOW_STARTED', agentName: this.name, timestamp: new Date() });

      // Step 1: Collector
      const collectorRes = await this.collector.execute();
      const messages = collectorRes.data || [];

      // Step 2: Priority
      const priorityRes = await this.priority.execute(messages);
      const scoredMessages = priorityRes.data?.scoredMessages || messages;

      // Step 3: Summary
      await this.summary.execute(scoredMessages);

      // Step 4: Task
      const taskRes = await this.task.execute();
      const tasks = taskRes.data?.tasks || [];

      // Step 5: Calendar
      const calendarRes = await this.calendar.execute({ action: 'GET_EVENTS' });
      const events = calendarRes.data?.events || [];

      // Step 6: Memory
      await this.memory.execute();

      // Step 7: Reply
      if (scoredMessages.length > 0) {
        await this.reply.execute({ messageId: scoredMessages[0].id });
      }

      const urgentCount = scoredMessages.filter(m => m.priority === 'URGENT').length;

      const demoNotifications = DemoStoreService.getInstance().getNotifications();

      const dashboardData: DashboardData = {
        metrics: {
          totalUnreadMessages: scoredMessages.filter(m => m.status === 'UNREAD').length || scoredMessages.length,
          urgentMessagesCount: urgentCount,
          pendingTasksCount: tasks.length,
          upcomingEventsCount: events.length,
          commitmentsCount: 2
        },
        recentMessages: scoredMessages,
        priorityTasks: tasks,
        todaysEvents: events,
        unreadNotifications: demoNotifications,
        lastRefreshedAt: new Date()
      };


      this.memoryCache.set('dashboard_current', dashboardData, 60);

      const duration = Date.now() - startTime;
      this.healthMonitor.recordExecution(this.name, duration, true);
      this.eventBus.emit({ type: 'WORKFLOW_COMPLETED', agentName: this.name, timestamp: new Date(), executionTimeMs: duration });

      return this.createSuccessResponse(dashboardData, duration, `Orchestrator pipeline executed successfully (${workflowId})`);
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.healthMonitor.recordExecution(this.name, duration, false, errorMsg);
      return this.createErrorResponse(errorMsg, duration);
    }
  }
}
