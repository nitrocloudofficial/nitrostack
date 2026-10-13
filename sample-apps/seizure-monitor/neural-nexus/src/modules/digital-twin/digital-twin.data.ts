/**
 * Digital Twin mock enterprise state.
 *
 * The AI Workplace Digital Twin sits above enterprise SaaS tools (GitHub, Jira,
 * Slack, Datadog, Gmail, Calendar) and represents the live organizational state.
 * For the hackathon MVP, these integrations are mocked with state objects that
 * represent what real MCP servers return.
 */

export type DepartmentId =
  | 'engineering'
  | 'operations'
  | 'support'
  | 'hr'
  | 'finance'
  | 'security';

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface DepartmentHealth {
  departmentId: DepartmentId;
  departmentName: string;
  healthScore: number; // 0-100
  status: HealthStatus;
  lastUpdated: string;
  summary: string;
  owningAgent: string;
  sources: string[];
}

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'detected' | 'investigating' | 'analyzed' | 'mitigating' | 'resolved' | 'pending_approval';
export type RecommendationPriority = 'high' | 'medium' | 'low';
export type ActionStatus = 'pending' | 'approved' | 'executing' | 'executed' | 'rejected' | 'failed';

export interface Recommendation {
  recommendationId: string;
  incidentId: string;
  priority: RecommendationPriority;
  title: string;
  description: string;
  mcpServer: string; // which enterprise tool the Action Agent would drive
  status: ActionStatus;
  evidence?: string;
  confidence?: number;
  businessImpact?: string;
}

export interface TimelineEntry {
  timestamp: string;
  agent: string;
  event: string;
  detail: string;
}

export interface Incident {
  incidentId: string;
  title: string;
  category: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  timestamp: string;
  affectedDepartments: DepartmentId[];
  affectedSystems: string[];
  trigger: string;
  rootCause: string;
  confidenceScore: number; // 0-100
  businessImpact: {
    summary: string;
    engineeringRisk: HealthStatus;
    launchDelay: 'unlikely' | 'possible' | 'likely';
    customerImpact: HealthStatus;
    revenueRisk: HealthStatus;
    projectedHealthScore: number;
  };
  timeline: TimelineEntry[];
  recommendations: Recommendation[];
}

export interface AgentLog {
  logId: string;
  agent: string;
  timestamp: string;
  action: string;
  durationMs: number;
  status: 'success' | 'running' | 'failed';
  detail: string;
}

// ---------------------------------------------------------------------------
// SaaS Integration Mock States
// ---------------------------------------------------------------------------

export interface GitHubWorkflowRun {
  id: string;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | null;
  logs: string;
  commitSha: string;
  createdAt: string;
}

export interface GitHubPullRequest {
  id: string;
  title: string;
  author: string;
  mergeable: boolean;
  checksStatus: 'success' | 'failure' | 'pending';
  reviewsCount: number;
  createdAt: string;
}

export interface GitHubDeployment {
  id: string;
  env: string;
  status: 'queued' | 'in_progress' | 'success' | 'failed';
  commitSha: string;
  createdAt: string;
}

export interface GitHubIssue {
  id: string;
  title: string;
  timestamp: string;
}

export interface GitHubMockState {
  workflowRuns: GitHubWorkflowRun[];
  pullRequests: GitHubPullRequest[];
  deployments: GitHubDeployment[];
  issues: GitHubIssue[];
  averageIssueRate: number; // average issues per hour
}

export interface DatadogMockState {
  cpu: number;
  memory: number;
  httpCheckFailures: number; // consecutive failed healthchecks
  lastUpdated: string;
}

export interface JiraSprint {
  sprintId: string;
  name: string;
  storyPointsTotal: number;
  storyPointsRemaining: number;
  velocity: number; // story points completed per day
  startDate: string;
  endDate: string;
}

export interface JiraIssue {
  ticketId: string;
  title: string;
  status: 'Todo' | 'In Progress' | 'Done' | 'In Review';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee: string;
  completionProgress: number; // 0-100
}

export interface JiraMockState {
  sprints: JiraSprint[];
  issues: JiraIssue[];
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  type: 'release' | 'demo' | 'review' | 'ooo' | 'regular';
  startTime: string;
  endTime: string;
  attendees: string[];
}

export interface CalendarMockState {
  events: GoogleCalendarEvent[];
}

// Global enterprise state
export interface EnterpriseState {
  github: GitHubMockState;
  datadog: DatadogMockState;
  jira: JiraMockState;
  calendar: CalendarMockState;
  isMonitoringActive: boolean;
  lastPollTimestamp: string | null;
  pollCount: number;
}

const now = () => new Date().toISOString();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();

// Initial SaaS State (Healthy / Nominal)
export const initialEnterpriseState: EnterpriseState = {
  github: {
    workflowRuns: [
      {
        id: 'run-100',
        name: 'CI Build & Test',
        status: 'completed',
        conclusion: 'success',
        logs: 'All 42 tests passed. Compile completed successfully.',
        commitSha: 'b45c21',
        createdAt: minutesAgo(15),
      }
    ],
    pullRequests: [
      {
        id: 'pr-45',
        title: 'feat: Add checkout multi-payment option',
        author: 'Sarah Jenkins',
        mergeable: true,
        checksStatus: 'success',
        reviewsCount: 2,
        createdAt: hoursAgo(4),
      }
    ],
    deployments: [
      {
        id: 'dep-90',
        env: 'production',
        status: 'success',
        commitSha: 'b45c21',
        createdAt: hoursAgo(12),
      }
    ],
    issues: [
      { id: 'issue-1', title: 'Dark mode contrast adjustment', timestamp: hoursAgo(5) },
      { id: 'issue-2', title: 'Typo in footer links', timestamp: hoursAgo(2) },
    ],
    averageIssueRate: 1.2, // 1.2 issues per hour
  },
  datadog: {
    cpu: 45, // 45% CPU
    memory: 62, // 62% RAM
    httpCheckFailures: 0,
    lastUpdated: now(),
  },
  jira: {
    sprints: [
      {
        sprintId: 'sprint-4',
        name: 'Q3 Sprint 4 - Checkout & Payments',
        storyPointsTotal: 80,
        storyPointsRemaining: 30,
        velocity: 8, // can complete 8 points per day
        startDate: daysFromNow(-8),
        endDate: daysFromNow(4), // 4 days left
      }
    ],
    issues: [
      {
        ticketId: 'PAY-882',
        title: 'Implement backup payment gateway provider',
        status: 'In Progress',
        priority: 'high',
        assignee: 'Alex Rivera',
        completionProgress: 85,
      },
      {
        ticketId: 'PAY-883',
        title: 'Fix credit card validation regex edgecase',
        status: 'Todo',
        priority: 'medium',
        assignee: 'Sarah Jenkins',
        completionProgress: 10,
      }
    ],
  },
  calendar: {
    events: [
      {
        id: 'evt-1',
        title: 'Sprint Demo & Release Review',
        type: 'release',
        startTime: daysFromNow(0.5), // in 12 hours
        endTime: daysFromNow(0.6),
        attendees: ['Alex Rivera', 'Sarah Jenkins', 'Marcus Chen (PM)'],
      }
    ]
  },
  isMonitoringActive: false,
  lastPollTimestamp: null,
  pollCount: 0,
};

// ---------------------------------------------------------------------------
// Departments (Live Digital Twin)
// ---------------------------------------------------------------------------
export const departments: DepartmentHealth[] = [
  {
    departmentId: 'engineering',
    departmentName: 'Engineering',
    healthScore: 98,
    status: 'healthy',
    lastUpdated: now(),
    summary: 'All CI/CD pipelines green. Infrastructure metrics healthy.',
    owningAgent: 'Engineering Agent',
    sources: ['GitHub', 'Jira', 'Datadog'],
  },
  {
    departmentId: 'operations',
    departmentName: 'Operations',
    healthScore: 95,
    status: 'healthy',
    lastUpdated: now(),
    summary: 'Release schedules align with Jira progress. Sprint is on track.',
    owningAgent: 'Operations Agent',
    sources: ['Google Calendar', 'Jira'],
  },
  {
    departmentId: 'support',
    departmentName: 'Support',
    healthScore: 96,
    status: 'healthy',
    lastUpdated: now(),
    summary: 'Customer issue reports remain within baseline rates.',
    owningAgent: 'Support Agent',
    sources: ['GitHub Issues'],
  },
  {
    departmentId: 'hr',
    departmentName: 'HR',
    healthScore: 100,
    status: 'healthy',
    lastUpdated: now(),
    summary: 'No critical staffing absences or scheduling conflicts.',
    owningAgent: 'Operations Agent',
    sources: ['Google Calendar'],
  },
  {
    departmentId: 'finance',
    departmentName: 'Finance',
    healthScore: 98,
    status: 'healthy',
    lastUpdated: now(),
    summary: 'System metrics and checkouts operational. No revenue risks.',
    owningAgent: 'Executive Agent',
    sources: ['Datadog'],
  },
  {
    departmentId: 'security',
    departmentName: 'Security',
    healthScore: 100,
    status: 'healthy',
    lastUpdated: now(),
    summary: 'No system health check failures or unauthorized accesses.',
    owningAgent: 'Monitoring Agent',
    sources: ['Datadog'],
  },
];

// ---------------------------------------------------------------------------
// Incidents (with root cause, business impact, timeline, recommendations)
// ---------------------------------------------------------------------------
export const incidents: Incident[] = [];

// ---------------------------------------------------------------------------
// Agent activity log (Live Agent Visualization)
// ---------------------------------------------------------------------------
export const agentLogs: AgentLog[] = [
  {
    logId: 'LOG-INIT',
    agent: 'Monitoring Agent',
    timestamp: now(),
    action: 'Initialized Enterprise Digital Twin systems',
    durationMs: 120,
    status: 'success',
    detail: 'All metrics nominal. Live polling ready.',
  }
];

/** The canonical multi-agent pipeline for live visualization. */
export const agentPipeline = [
  'Monitoring Agent',
  'Engineering Agent',
  'Operations Agent',
  'Support Agent',
  'Executive Agent',
  'Action Agent',
];
