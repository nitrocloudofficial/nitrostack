import { ControllerDecorator as Controller, ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { DatabaseService } from '../database/database.service.js';
import { AiService } from '../ai/ai.service.js';

@Controller('foundry')
export class FoundryTools {
  constructor(
    private readonly db: DatabaseService,
    private readonly ai: AiService
  ) {}

  @Tool({
    name: 'start_project',
    description: 'Start a new project in the Foundry and generate 6 learning phases.',
    inputSchema: z.object({
      userId: z.number(),
      title: z.string(),
      techStack: z.string().optional(),
      description: z.string().optional(),
    })
  })
  async startProject(input: { userId: number, title: string, techStack?: string, description?: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Generating phases for project: ${input.title}`);
    
    // Generate Phases via LLM
    const phases = await this.ai.generateProjectPhases(input.title, input.techStack || "general software development");
    
    const projectData = {
      title: input.title,
      tech_stack: input.techStack || "general software development",
      description: input.description || "A learning project",
      current_phase: 1,
      total_phases: 6,
      phases: phases,
      started_at: new Date().toISOString()
    };

    // Save to Database
    const project = await this.db.project.create({
      data: {
        userId: input.userId,
        title: input.title,
        dataJson: projectData,
        codeContent: '',
      }
    });

    return {
      success: true,
      projectId: project.id,
      project: projectData
    };
  }

  @Tool({
    name: 'chat_architect',
    description: 'Chat with the Foundry Architect to get help with code.',
    inputSchema: z.object({
      message: z.string(),
      code: z.string(),
      context: z.any()
    })
  })
  async chatArchitect(input: { message: string, code: string, context: any }) {
    const response = await this.ai.chatArchitect(input.message, input.code, input.context);
    return {
      success: true,
      response: response
    };
  }

  @Tool({
    name: 'get_projects',
    description: 'Get all active projects for a user.',
    inputSchema: z.object({
      userId: z.number()
    })
  })
  async getProjects(input: { userId: number }) {
    const projects = await this.db.project.findMany({
      where: { userId: input.userId },
      orderBy: { updatedAt: 'desc' }
    });
    
    return {
      success: true,
      projects: projects.map(p => ({
        id: p.id,
        ...p.dataJson as any
      }))
    };
  }

  @Tool({
    name: 'delete_project',
    description: 'Delete a project',
    inputSchema: z.object({
      projectId: z.string(),
    })
  })
  async deleteProject(input: { projectId: string }) {
    await this.db.project.delete({
      where: { id: input.projectId }
    });
    return { success: true };
  }

  @Tool({
    name: 'get_project',
    description: 'Get a specific project',
    inputSchema: z.object({
      projectId: z.string(),
    })
  })
  async getProject(input: { projectId: string }) {
    const project = await this.db.project.findUnique({
      where: { id: input.projectId }
    });
    if (!project) return { error: "Project not found" };
    return { ...project.dataJson as any, id: project.id, codeContent: project.codeContent };
  }

  @Tool({
    name: 'unlock_phase',
    description: 'Unlock a project phase',
    inputSchema: z.object({
      projectId: z.string(),
      phaseId: z.number(),
    })
  })
  async unlockPhase(input: { projectId: string, phaseId: number }) {
    const project = await this.db.project.findUnique({ where: { id: input.projectId } });
    if (!project) return { error: "Project not found" };
    
    const data: any = project.dataJson;
    data.current_phase = input.phaseId;
    
    await this.db.project.update({
      where: { id: input.projectId },
      data: { dataJson: data }
    });
    return { success: true, current_phase: input.phaseId };
  }

  @Tool({
    name: 'foundry_push_workspace',
    description: 'Sync entire workspace state (files, team messages)',
    inputSchema: z.object({
      projectId: z.string(),
      files: z.array(z.any()),
      teamMessages: z.array(z.any()),
      lastUpdated: z.number().optional()
    })
  })
  async pushWorkspace(input: { projectId: string, files: any[], teamMessages: any[], lastUpdated?: number }) {
    const project = await this.db.project.findUnique({ where: { id: input.projectId } });
    if (!project) return { error: "Project not found" };
    
    let data: any = project.dataJson || {};
    
    // Simple Last-Write-Wins based on a timestamp if provided, but for hackathon, direct overwrite is fine.
    data.workspaceState = {
      files: input.files,
      teamMessages: input.teamMessages,
      lastUpdated: input.lastUpdated || Date.now()
    };
    
    await this.db.project.update({
      where: { id: input.projectId },
      data: { dataJson: data }
    });
    
    return { success: true };
  }

  @Tool({
    name: 'verify_code',
    description: 'Verify project code',
    inputSchema: z.object({
      projectId: z.string(),
      code: z.string(),
      type: z.string().optional()
    })
  })
  async verifyCode(input: { projectId: string, code: string, type?: string }) {
    const simulatedOutput = await this.ai.simulateTerminal(input.code);
    return { success: true, message: simulatedOutput };
  }

  @Tool({
    name: 'foundry_start_empty_project',
    description: 'Starts a blank project for collaborative workspace',
    inputSchema: z.object({
      userId: z.number()
    })
  })
  async startEmptyProject(input: { userId: number }) {
    const dataJson = {
      title: "Collaborative Workspace",
      type: "collaboration",
      tech_stack: "Collaborative",
      phases: [
        {
          id: 1,
          title: "Open Collaboration",
          description: "A free-form collaborative workspace for real-time coding.",
          status: "in-progress"
        }
      ],
      current_phase: 1
    };
    
    const project = await this.db.project.create({
      data: {
        userId: input.userId,
        title: "Collaborative Workspace",
        dataJson,
        codeContent: "// Shared Collaborative Workspace Started\n"
      }
    });

    return {
      success: true,
      project_id: project.id,
      data: dataJson
    };
  }

  @Tool({
    name: 'foundry_generate_session_code',
    description: 'Generate or retrieve a sharing session code for a project',
    inputSchema: z.object({
      projectId: z.string()
    })
  })
  async generateSessionCode(input: { projectId: string }) {
    const project = await this.db.project.findUnique({ where: { id: input.projectId } });
    if (!project) return { error: "Project not found" };

    let data: any = project.dataJson || {};
    if (data.sessionCode) {
      return { success: true, sessionCode: data.sessionCode };
    }

    // Generate 6 digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    data.sessionCode = code;

    await this.db.project.update({
      where: { id: input.projectId },
      data: { dataJson: data }
    });

    return { success: true, sessionCode: code };
  }

  @Tool({
    name: 'foundry_join_session',
    description: 'Join a project session by 6-digit code',
    inputSchema: z.object({
      sessionCode: z.string()
    })
  })
  async joinSession(input: { sessionCode: string }) {
    // In SQLite, filtering JSON in Prisma is limited. We fetch all projects.
    // For production, this should use a separate Session table or proper DB JSON indexing.
    const projects = await this.db.project.findMany();
    
    for (const p of projects) {
      const data: any = p.dataJson;
      if (data && data.sessionCode === input.sessionCode) {
        return { success: true, project_id: p.id };
      }
    }

    return { error: "Invalid Code or Session Expired." };
  }
}
