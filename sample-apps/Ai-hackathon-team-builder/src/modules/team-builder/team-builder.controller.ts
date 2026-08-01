import { ControllerDecorator as Controller, ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';
import { TeamBuilderService } from './team-builder.service.js';

@Controller('team_builder')
export class TeamBuilderController {
  constructor(private readonly service: TeamBuilderService) {}

  @Tool({
    name: 'register_student',
    description: 'Register a new student profile in the hackathon database.',
    inputSchema: z.object({
      name: z.string().describe('Full name of the student'),
      department: z.string().describe('Academic department e.g. Computer Science'),
      skills: z.array(z.string()).describe('List of technical skills e.g. ["React", "Python"]'),
      interests: z.array(z.string()).describe('List of interest areas e.g. ["AI", "Healthcare"]'),
      experience: z.enum(['beginner', 'intermediate', 'advanced']).describe('Experience level'),
      availability: z.array(z.string()).describe('Availability e.g. ["weekdays", "weekends"]')
    })
  })
  async registerStudent(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Registering student: ${input.name}`);
    return await this.service.registerStudent(input);
  }

  @Tool({
    name: 'find_students',
    description: 'Find and search students by technical skill or experience level.',
    inputSchema: z.object({
      skill: z.string().optional().describe('Skill keyword to search for e.g. React, Python, Figma'),
      experience: z.string().optional().describe('Experience level filter e.g. beginner, intermediate, advanced')
    })
  })
  async findStudents(input: { skill?: string; experience?: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Searching students with skill: ${input.skill}, experience: ${input.experience}`);
    return await this.service.findStudents(input.skill, input.experience);
  }

  @Tool({
    name: 'compatibility_score',
    description: 'Calculate overall compatibility score (skill, availability, interest match) for a list of student IDs.',
    inputSchema: z.object({
      student_ids: z.array(z.number()).describe('List of student IDs in the candidate team')
    })
  })
  async compatibilityScore(input: { student_ids: number[] }, ctx: ExecutionContext) {
    ctx.logger.info(`Calculating compatibility score for IDs: ${input.student_ids.join(',')}`);
    return await this.service.calculateCompatibilityScore(input.student_ids);
  }

  @Tool({
    name: 'analyze_team',
    description: 'Analyze a team to identify missing required role skills (Frontend, Backend, AI, DevOps).',
    inputSchema: z.object({
      team_id: z.number().describe('ID of the team to analyze')
    })
  })
  async analyzeTeam(input: { team_id: number }, ctx: ExecutionContext) {
    ctx.logger.info(`Analyzing team ID: ${input.team_id}`);
    return await this.service.analyzeTeam(input.team_id);
  }

  @Tool({
    name: 'assign_roles',
    description: 'Intelligently assign roles to team members based on their skill strengths.',
    inputSchema: z.object({
      team_id: z.number().describe('ID of the team')
    })
  })
  async assignRoles(input: { team_id: number }, ctx: ExecutionContext) {
    ctx.logger.info(`Assigning roles for team ID: ${input.team_id}`);
    return await this.service.assignRoles(input.team_id);
  }

  @Tool({
    name: 'generate_task_plan',
    description: 'Generate a 3-day hackathon task plan (Day 1, Day 2, Day 3 breakdown) for a team.',
    inputSchema: z.object({
      team_id: z.number().describe('ID of the team'),
      project_type: z.string().optional().describe('Type of project e.g. AI Web Platform, Mobile App')
    })
  })
  async generateTaskPlan(input: { team_id: number; project_type?: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Generating 3-day task plan for team ID: ${input.team_id}`);
    return await this.service.generateTaskPlan(input.team_id, input.project_type);
  }
}
