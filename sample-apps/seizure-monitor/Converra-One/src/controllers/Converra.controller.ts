import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  ResourceDecorator as Resource,
  PromptDecorator as Prompt,
  Widget,
  z
} from '@nitrostack/core';

import { DashboardWorkflowService } from '../workflows/DashboardWorkflow.service.js';
import { InboxWorkflowService } from '../workflows/InboxWorkflow.service.js';
import { SearchWorkflowService } from '../workflows/SearchWorkflow.service.js';
import { ReplyWorkflowService } from '../workflows/ReplyWorkflow.service.js';
import { CalendarWorkflowService } from '../workflows/CalendarWorkflow.service.js';
import { TaskWorkflowService } from '../workflows/TaskWorkflow.service.js';
import { ConnectorManagerService } from '../services/ConnectorManager.service.js';
import { OrchestratorAgent } from '../modules/orchestrator/OrchestratorAgent.js';
import { AgentHealthMonitorService } from '../services/AgentHealthMonitor.service.js';
import { MemoryAgent } from '../modules/memory/MemoryAgent.js';

@Controller()
export class ConverraController {
  private dashboardWorkflow = new DashboardWorkflowService();
  private inboxWorkflow = new InboxWorkflowService();
  private searchWorkflow = new SearchWorkflowService();
  private replyWorkflow = new ReplyWorkflowService();
  private calendarWorkflow = new CalendarWorkflowService();
  private taskWorkflow = new TaskWorkflowService();
  private connectorManager = ConnectorManagerService.getInstance();
  private healthMonitor = AgentHealthMonitorService.getInstance();

  // -------------------------------------------------------------
  // MCP TOOLS
  // -------------------------------------------------------------

  @Tool({
    name: 'getUnifiedInbox',
    description: 'Fetches cross-platform filtered inbox stream across Gmail, Slack, GitHub, Discord, and Notion',
    inputSchema: z.object({})
  })
  @Widget('inbox')
  async getUnifiedInbox() {
    return this.inboxWorkflow.getUnifiedInbox();
  }

  @Tool({
    name: 'getDailyBriefing',
    description: 'Synthesizes executive morning briefing based on inbox, tasks, and agenda schedule',
    inputSchema: z.object({})
  })
  @Widget('briefing')
  async getDailyBriefing() {
    const data = await this.dashboardWorkflow.getDashboardData();
    return data.metrics;
  }

  @Tool({
    name: 'searchCommunications',
    description: 'Performs hybrid natural language search across all connected platforms',
    inputSchema: z.object({
      query: z.string().describe('Search query string')
    })
  })
  @Widget('search')
  async searchCommunications(input: { query: string }) {
    return this.searchWorkflow.search(input.query);
  }

  @Tool({
    name: 'replyToMessage',
    description: 'Generates context-aware multi-tone smart reply suggestions',
    inputSchema: z.object({
      messageId: z.string().describe('Target message ID'),
      tone: z.string().optional().describe('Tone: Professional, Friendly, Formal, Short, Detailed')
    })
  })
  @Widget('reply')
  async replyToMessage(input: { messageId: string; tone?: string }) {
    return this.replyWorkflow.generateReply(input.messageId, input.tone);
  }

  @Tool({
    name: 'extractTasks',
    description: 'Extracts actionable deliverables and commitments from messages',
    inputSchema: z.object({})
  })
  @Widget('tasks')
  async extractTasks() {
    return this.taskWorkflow.extractTasksFromMessages();
  }

  @Tool({
    name: 'runWorkflow',
    description: 'Triggers the full end-to-end multi-agent orchestration pipeline',
    inputSchema: z.object({})
  })
  @Widget('dashboard')
  async runWorkflow() {
    return this.dashboardWorkflow.getDashboardData();
  }

  @Tool({
    name: 'createCalendarReminder',
    description: 'Creates a calendar reminder event after user confirmation',
    inputSchema: z.object({
      title: z.string().describe('Reminder title'),
      startTime: z.string().describe('ISO timestamp string')
    })
  })
  @Widget('calendar')
  async createCalendarReminder(input: { title: string; startTime: string }) {
    return this.calendarWorkflow.createReminder(input.title, new Date(input.startTime));
  }

  @Tool({
    name: 'getPlatformStatus',
    description: 'Returns connection status for 6 integrated platforms (Gmail, Slack, Discord, GitHub, Notion, Calendar)',
    inputSchema: z.object({})
  })
  @Widget('platform-status')
  async getPlatformStatus() {
    return this.connectorManager.getPlatformStatuses();
  }

  @Tool({
    name: 'refreshPlatforms',
    description: 'Triggers a re-sync across all platform channels',
    inputSchema: z.object({})
  })
  async refreshPlatforms() {
    const msgs = await this.connectorManager.fetchAllMessages();
    return { status: 'success', refreshedAt: new Date(), harvestedCount: msgs.length };
  }

  // -------------------------------------------------------------
  // MCP RESOURCES
  // -------------------------------------------------------------

  @Resource({
    uri: 'resource://dashboard/current',
    name: 'Current Dashboard Data',
    description: 'Aggregated dashboard metrics, priority messages, tasks, and schedule'
  })
  async getDashboardResource() {
    return this.dashboardWorkflow.getDashboardData();
  }

  @Resource({
    uri: 'resource://inbox/unified',
    name: 'Unified Inbox Stream',
    description: 'Multi-platform aggregated message stream'
  })
  async getInboxResource() {
    return this.inboxWorkflow.getUnifiedInbox();
  }

  @Resource({
    uri: 'resource://calendar/today',
    name: "Today's Calendar Schedule",
    description: 'Upcoming meetings, schedule timeline, and event reminders'
  })
  async getCalendarResource() {
    return this.calendarWorkflow.getTodayEvents();
  }

  @Resource({
    uri: 'resource://tasks/today',
    name: "Today's Extracted Tasks",
    description: 'Extracted deliverables, action items, and pending commitments'
  })
  async getTaskResource() {
    return this.taskWorkflow.extractTasksFromMessages();
  }

  @Resource({
    uri: 'resource://agent/timeline',
    name: 'Agent Execution Timeline',
    description: 'Live step-by-step agent workflow execution traces, tool invocations, order, and latency metrics'
  })
  async getTimelineResource() {
    return OrchestratorAgent.getTimeline();
  }

  @Resource({
    uri: 'resource://agent/health',
    name: 'Agent Health Telemetry',
    description: 'Real-time agent health indicators, processed count, success rate, and avg latency'
  })
  async getHealthResource() {
    return this.healthMonitor.getMetrics();
  }

  @Resource({
    uri: 'resource://memory/conversations',
    name: 'Conversation Memory Store',
    description: 'Cross-channel user commitments, promises, and contextual thread memory'
  })
  async getMemoryResource() {
    const agent = new MemoryAgent();
    const result = await agent.execute();
    return result.data?.commitments || [];
  }

  @Resource({
    uri: 'resource://platforms/status',
    name: 'Platform Connection Health Status',
    description: 'Connection status, accounts, and sync times for 6 integrations'
  })
  async getPlatformResource() {
    return this.connectorManager.getPlatformStatuses();
  }

  @Resource({
    uri: 'resource://search/index',
    name: 'Search Engine Index',
    description: 'Search index statistics and recent natural language query results'
  })
  async getSearchResource() {
    return this.searchWorkflow.search('default');
  }

  // -------------------------------------------------------------
  // MCP PROMPTS
  // -------------------------------------------------------------

  @Prompt({
    name: 'PriorityClassification',
    description: 'Prompt template for AI agent scoring message urgency and sender authority',
    arguments: [
      { name: 'sender', description: 'Sender email or name', required: true },
      { name: 'content', description: 'Raw message body', required: true }
    ]
  })
  async priorityClassificationPrompt(args: { sender: string; content: string }) {
    return `Classify urgency (0.00 to 1.00) and priority level for message from ${args.sender}: "${args.content}"`;
  }

  @Prompt({
    name: 'ConversationSummarisation',
    description: 'Prompt template for AI agent thread executive summarization',
    arguments: [
      { name: 'thread', description: 'Conversation thread history', required: true }
    ]
  })
  async conversationSummarisationPrompt(args: { thread: string }) {
    return `Provide a 3-bullet executive summary and key takeaways for conversation thread: ${args.thread}`;
  }
}
