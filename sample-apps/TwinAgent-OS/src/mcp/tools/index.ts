export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const mcpToolDefinitions: MCPToolDefinition[] = [
  {
    name: 'predictProjectRisk',
    description: 'Calculate real-time project risk score, health score, and task completion metrics',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Unique Project UUID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'predictBurnout',
    description: 'Scan organization for employee burnout risks, workload imbalances, and delayed project dependencies',
    inputSchema: {
      type: 'object',
      properties: {
        organizationId: { type: 'string', description: 'Unique Organization UUID' },
      },
      required: ['organizationId'],
    },
  },
  {
    name: 'updateTask',
    description: 'Update status, priority, or risk score of an enterprise task',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task UUID' },
        userId: { type: 'string', description: 'User performing update UUID' },
        status: { type: 'string', enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'] },
        riskScore: { type: 'number', description: 'Updated risk score (0-100)' },
      },
      required: ['taskId', 'userId'],
    },
  },
  {
    name: 'searchKnowledge',
    description: 'Perform semantic & keyword search across organizational memory entries and decisions',
    inputSchema: {
      type: 'object',
      properties: {
        organizationId: { type: 'string', description: 'Organization UUID' },
        query: { type: 'string', description: 'Search term or topic' },
        category: { type: 'string', description: 'Optional memory category filter' },
      },
      required: ['organizationId', 'query'],
    },
  },
  {
    name: 'organizationHealth',
    description: 'Retrieve real-time executive dashboard metrics including overall digital twin health, burnout index, and velocity',
    inputSchema: {
      type: 'object',
      properties: {
        organizationId: { type: 'string', description: 'Organization UUID' },
      },
      required: ['organizationId'],
    },
  },
  {
    name: 'summarizeProject',
    description: 'Retrieve comprehensive project details including tasks, milestones, sprints, and assigned team members',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project UUID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'recommendAssignee',
    description: 'Recommend optimal task assignee based on current workload capacity and skill availability',
    inputSchema: {
      type: 'object',
      properties: {
        organizationId: { type: 'string', description: 'Organization UUID' },
        requiredSkills: { type: 'array', items: { type: 'string' } },
      },
      required: ['organizationId'],
    },
  },
  {
    name: 'findExpert',
    description: 'Find organizational experts by specific skill name and proficiency level',
    inputSchema: {
      type: 'object',
      properties: {
        organizationId: { type: 'string', description: 'Organization UUID' },
        skillName: { type: 'string', description: 'Target skill keyword' },
      },
      required: ['organizationId', 'skillName'],
    },
  },
  {
    name: 'runWorkflow',
    description: 'Trigger an automated TwinAgent workflow or approval gate',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', description: 'Workflow UUID' },
        requesterId: { type: 'string', description: 'User UUID triggering execution' },
        payload: { type: 'object', description: 'Trigger payload context' },
      },
      required: ['workflowId', 'requesterId'],
    },
  },
  {
    name: 'approveAction',
    description: 'Review and approve or reject a pending workflow action gate',
    inputSchema: {
      type: 'object',
      properties: {
        approvalId: { type: 'string', description: 'Approval request UUID' },
        reviewerId: { type: 'string', description: 'Reviewer user UUID' },
        status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
        reason: { type: 'string', description: 'Optional feedback reason' },
      },
      required: ['approvalId', 'reviewerId', 'status'],
    },
  },
  {
    name: 'syncConnector',
    description: 'Trigger synchronization job for connected enterprise accounts (GitHub, Slack, Jira, Google Workspace)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Connector account UUID' },
        mode: { type: 'string', enum: ['FULL', 'INCREMENTAL'] },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'calculateDigitalTwin',
    description: 'Recalculate multi-dimensional digital twin scores for a target user or project',
    inputSchema: {
      type: 'object',
      properties: {
        targetType: { type: 'string', enum: ['USER', 'PROJECT'] },
        targetId: { type: 'string', description: 'User or Project UUID' },
      },
      required: ['targetType', 'targetId'],
    },
  },
  {
    name: 'getGraph',
    description: 'Retrieve Enterprise Knowledge Graph nodes and relationship edges for an organization',
    inputSchema: {
      type: 'object',
      properties: {
        organizationId: { type: 'string', description: 'Organization UUID' },
      },
      required: ['organizationId'],
    },
  },
  {
    name: 'globalSearch',
    description: 'Execute global search across tasks, projects, users, and organizational memory',
    inputSchema: {
      type: 'object',
      properties: {
        organizationId: { type: 'string', description: 'Organization UUID' },
        query: { type: 'string', description: 'Search term' },
      },
      required: ['organizationId', 'query'],
    },
  },
  {
    name: 'getAuditLogs',
    description: 'Retrieve organization security audit logs for compliance review',
    inputSchema: {
      type: 'object',
      properties: {
        organizationId: { type: 'string', description: 'Organization UUID' },
      },
      required: ['organizationId'],
    },
  },
];
