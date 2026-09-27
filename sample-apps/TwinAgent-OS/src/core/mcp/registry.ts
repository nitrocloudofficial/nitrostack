import { projectService } from '../projects/service.js';
import { predictionEngineService } from '../prediction/service.js';
import { taskService } from '../tasks/service.js';
import { memoryService } from '../memory/service.js';
import { digitalTwinService } from '../digitalTwin/service.js';
import { workflowService } from '../workflows/service.js';
import { approvalService } from '../approval/service.js';
import { integrationsService } from '../integrations/service.js';
import { userService } from '../users/service.js';
import { prisma } from '../../config/database.js';

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
  handler: (args: any, context: { organizationId: string; userId: string }) => Promise<unknown>;
}

export class MCPRegistry {
  private static instance: MCPRegistry;
  private tools: Map<string, MCPToolDefinition> = new Map();

  private constructor() {
    this.registerCoreTools();
  }

  public static getInstance(): MCPRegistry {
    if (!MCPRegistry.instance) {
      MCPRegistry.instance = new MCPRegistry();
    }
    return MCPRegistry.instance;
  }

  private registerCoreTools() {
    this.registerTool({
      name: 'predictProjectRisk',
      description: 'Calculate risk scores and predict delivery failure probabilities for a specific project.',
      inputSchema: {
        type: 'object',
        properties: { projectId: { type: 'string' } },
        required: ['projectId'],
      },
      handler: async (args) => projectService.calculateProjectMetrics(args.projectId),
    });

    this.registerTool({
      name: 'predictBurnout',
      description: 'Run burnout prediction scan across organizational workforce.',
      inputSchema: { type: 'object', properties: {} },
      handler: async (args, ctx) => predictionEngineService.runOrganizationScan(ctx.organizationId),
    });

    this.registerTool({
      name: 'updateTask',
      description: 'Update status, priority, or details of a project task.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'string' },
        },
        required: ['taskId'],
      },
      handler: async (args, ctx) => taskService.updateTask(args.taskId, ctx.userId, args),
    });

    this.registerTool({
      name: 'searchKnowledge',
      description: 'Search organizational memory and timeline history.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' }, category: { type: 'string' } },
        required: ['query'],
      },
      handler: async (args, ctx) => memoryService.searchMemory(ctx.organizationId, args.query, args.category),
    });

    this.registerTool({
      name: 'organizationHealth',
      description: 'Retrieve real-time digital twin health overview for the organization.',
      inputSchema: { type: 'object', properties: {} },
      handler: async (args, ctx) => digitalTwinService.getHistoricalSnapshots('ORGANIZATION' as any, ctx.organizationId, 1),
    });

    this.registerTool({
      name: 'summarizeProject',
      description: 'Generate comprehensive summary of project health, tasks, and risks.',
      inputSchema: {
        type: 'object',
        properties: { projectId: { type: 'string' } },
        required: ['projectId'],
      },
      handler: async (args) => {
        const project = await projectService.getProjectById(args.projectId);
        return {
          id: project.id,
          name: project.name,
          status: project.status,
          riskScore: project.riskScore,
          healthScore: project.healthScore,
          totalTasks: project.tasks.length,
          summaryText: `Project '${project.name}' (${project.key}) has ${project.tasks.length} active tasks, health score of ${project.healthScore}%, and risk score of ${project.riskScore}%.`,
        };
      },
    });

    this.registerTool({
      name: 'recommendAssignee',
      description: 'Find best matching employee for a task based on capacity, skills, and current workload.',
      inputSchema: {
        type: 'object',
        properties: { requiredSkill: { type: 'string' }, estimatedHours: { type: 'number' } },
        required: ['requiredSkill'],
      },
      handler: async (args, ctx) => {
        const users = await userService.getAllUsers(ctx.organizationId);
        const candidates = users
          .map((u) => {
            const hasSkill = u.skills.some((s) => s.name.toLowerCase().includes(args.requiredSkill.toLowerCase()));
            const loadRatio = u.currentWorkload / u.weeklyCapacity;
            const score = (hasSkill ? 50 : 0) + (100 - Math.min(100, loadRatio * 100)) * 0.5;
            return { user: { id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email }, matchScore: score, currentLoadRatio: Math.round(loadRatio * 100) };
          })
          .sort((a, b) => b.matchScore - a.matchScore);

        return { recommendedAssignee: candidates[0], candidates };
      },
    });

    this.registerTool({
      name: 'findExpert',
      description: 'Search for organization subject matter experts by skill or domain knowledge.',
      inputSchema: {
        type: 'object',
        properties: { domainSkill: { type: 'string' } },
        required: ['domainSkill'],
      },
      handler: async (args, ctx) => {
        const skills = await prisma.skill.findMany({
          where: {
            user: { organizationId: ctx.organizationId },
            name: { contains: args.domainSkill, mode: 'insensitive' },
          },
          include: { user: { select: { id: true, firstName: true, lastName: true, jobTitle: true, email: true } } },
          orderBy: { proficiency: 'desc' },
        });
        return skills.map((s) => ({ expert: s.user, skillName: s.name, proficiency: s.proficiency }));
      },
    });

    this.registerTool({
      name: 'runWorkflow',
      description: 'Trigger execution of an enterprise workflow.',
      inputSchema: {
        type: 'object',
        properties: { workflowId: { type: 'string' }, payload: { type: 'object' } },
        required: ['workflowId'],
      },
      handler: async (args, ctx) => workflowService.executeWorkflow(args.workflowId, args.payload || {}, ctx.userId),
    });

    this.registerTool({
      name: 'approveAction',
      description: 'Approve or reject a pending workflow approval request.',
      inputSchema: {
        type: 'object',
        properties: { approvalId: { type: 'string' }, status: { type: 'string' }, reason: { type: 'string' } },
        required: ['approvalId', 'status'],
      },
      handler: async (args, ctx) => approvalService.reviewApproval(args.approvalId, ctx.userId, args.status, args.reason),
    });

    this.registerTool({
      name: 'syncConnector',
      description: 'Trigger periodic or manual sync for an external connector account (GitHub, Slack, Jira).',
      inputSchema: {
        type: 'object',
        properties: { accountId: { type: 'string' }, mode: { type: 'string' } },
        required: ['accountId'],
      },
      handler: async (args) => integrationsService.triggerSync(args.accountId, args.mode || 'INCREMENTAL'),
    });
  }

  public registerTool(tool: MCPToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public getTools(): MCPToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public async executeTool(name: string, args: any, context: { organizationId: string; userId: string }) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`MCP Tool '${name}' not found in registry`);
    return tool.handler(args, context);
  }
}

export const mcpRegistry = MCPRegistry.getInstance();
