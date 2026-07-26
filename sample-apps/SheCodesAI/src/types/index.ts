export type InputSourceType = 'live' | 'transcript' | 'audio' | 'document';

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type ToolType = 'Slack' | 'Jira' | 'Notion' | 'GitHub' | 'Google Calendar';

export type ReasoningStage = 
  | 'Reading Transcript'
  | 'Understanding Context'
  | 'Extracting Tasks'
  | 'Detecting Deadlines'
  | 'Planning Workflow'
  | 'Checking Previous Memory'
  | 'Waiting for Approval'
  | 'Executing MCP'
  | 'Updating Knowledge'
  | 'Completed';

export interface ContextPack {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  summaryStyle: string;
  dashboardLayout: string;
  planningLogic: string;
  timelineStyle: string;
  reminderRules: string;
  notificationLogic: string;
  memoryStructure: string;
  analytics: string;
  suggestedIntegrations: ToolType[];
  isCustom?: boolean;
}

export interface ApprovalTask {
  id: string;
  title: string;
  description: string;
  priority: PriorityLevel;
  owner: string;
  deadline: string;
  suggestedTool: ToolType;
  confidenceScore: number;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  department?: string;
  executionLog?: string;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: 'trigger' | 'context' | 'planner' | 'approval' | 'mcp' | 'integration' | 'storage';
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  duration: string;
  retryCount: number;
  logs: string[];
}

export interface IntegrationItem {
  id: string;
  key: 'slack' | 'jira' | 'notion' | 'github' | 'calendar';
  name: string;
  category: string;
  description: string;
  icon: string;
  color?: string;
  status: 'connected' | 'disconnected' | 'warning';
  connectedAccount: string;
  permissions: string[];
  scopes: string[];
  rateLimit: string;
  apiHealth: number; // percentage
  lastSync: string;
  logs: string[];
  usageCount: number;
}

export interface DocumentVersion {
  version: string;
  timestamp: string;
  author: string;
  changeSummary: string;
}

export interface CommentItem {
  id: string;
  author: string;
  avatar: string;
  timestamp: string;
  text: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  meetingId: string;
  date: string;
  contextPack: string;
  summary: string;
  tags: string[];
  topics: string[];
  participants: string[];
  decisions: string[];
  pinned: boolean;
  archived: boolean;
  contentMarkdown: string;
  versions: DocumentVersion[];
  comments: CommentItem[];
}

export interface VectorMemoryNode {
  id: string;
  textSnippet: string;
  meetingTitle: string;
  timestamp: string;
  similarityScore: number;
  contextPack: string;
  category: string;
  connectedEntities: string[];
  vectorDimensions: number;
}

export interface Workspace {
  id: string;
  name: string;
  type: 'Company' | 'University' | 'Startup' | 'Hackathon Team' | 'Hospital' | 'Law Firm' | 'NGO' | 'Personal Workspace';
  membersCount: number;
  departments: string[];
  role: 'Owner' | 'Administrator' | 'Manager' | 'Lead' | 'Member' | 'Guest';
  projectsCount: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  ip: string;
  status: 'Success' | 'Failed' | 'Warning';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  priority: PriorityLevel;
  read: boolean;
  channel: 'Desktop' | 'Browser' | 'Email' | 'Calendar' | 'In-App' | 'Slack';
}

export interface CalendarEventItem {
  id: string;
  title: string;
  start: string;
  end: string;
  timezone: string;
  participants: string[];
  contextPack: string;
  taskRef?: string;
  status: 'Scheduled' | 'Completed' | 'Pending';
}
