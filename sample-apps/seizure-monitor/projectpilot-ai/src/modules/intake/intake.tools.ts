// intake.tools.ts
import {
  ToolDecorator as Tool,
  Injectable,
  type ExecutionContext,
} from '@nitrostack/core';
import {
  SrdInputSchema,
  TeamInputSchema,
  type SrdInput,
  type TeamInput,
} from '../../domain/schemas.js';
import { IntakeService } from './intake.service.js';

@Injectable({ deps: [IntakeService] })
export class IntakeTools {
  constructor(private readonly intakeService: IntakeService) {}

  @Tool({
    name: 'parse_srd',
    description:
      'Parse an uploaded or pasted Software Requirements Document and extract structured requirements.',
    inputSchema: SrdInputSchema,
    examples: {
      request: {
        srd_text:
          'The system shall allow users to register and log in.',
        project_duration_weeks: 8,
        deadline: '2026-10-01',
      },
      response: {
        project_context_id: 'proj_xxx',
        requirement_count: 2,
      },
    },
  })
  async parseSrd(input: SrdInput, ctx: ExecutionContext) {
    return this.intakeService.parseSrd(input, ctx);
  }

  @Tool({
    name: 'register_team',
    description: 'Register team members',
    inputSchema: TeamInputSchema,
  })
  async registerTeam(input: TeamInput, ctx: ExecutionContext) {
    return this.intakeService.registerTeam(input, ctx);
  }
  
}
