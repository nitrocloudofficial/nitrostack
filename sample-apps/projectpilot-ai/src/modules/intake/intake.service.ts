import { Injectable, type ExecutionContext } from '@nitrostack/core';
import { ProjectStateService } from '../../services/project-state.service.js';
import { extractTextFromSrdUpload, parseTeamRosterCsv } from '../../common/file-parsing.js';
import type { SrdInput, TeamInput, ProjectContext, Requirement } from '../../domain/schemas.js';

@Injectable({ deps: [ProjectStateService] })
export class IntakeService {
  constructor(private readonly state: ProjectStateService) {}

  public async parseSrd(input: SrdInput, _ctx: ExecutionContext) {
    const rawText = await extractTextFromSrdUpload(
      input.file_content,
      input.file_type,
      input.srd_text
    );

    const parsedRequirements = this.extractRequirementsFromText(rawText);
    const id = `proj_${Math.random().toString(36).substring(2, 11)}${Date.now().toString(36)}`;

    const context: ProjectContext = {
      project_context_id: id,
      created_at: new Date().toISOString(),
      srd_summary: {
        raw_text: rawText,
        parsed_requirements: parsedRequirements,
        project_duration_weeks: input.project_duration_weeks,
        deadline: input.deadline,
      },
    };

    this.state.set(id, context);

    return {
      project_context_id: id,
      requirement_count: parsedRequirements.length,
      extracted_requirements: parsedRequirements,
      project_duration_weeks: input.project_duration_weeks,
      deadline: input.deadline,
    };
  }

  public async registerTeam(input: TeamInput, _ctx: ExecutionContext) {
    const context = this.state.get(input.project_context_id);
    if (!context) {
      throw new Error(`Session ${input.project_context_id} not found.`);
    }

    let members = input.members || [];
    if (input.file_content) {
      const csvMembers = parseTeamRosterCsv(input.file_content);
      members = [...members, ...csvMembers];
    }

    this.state.update(input.project_context_id, (ctx) => {
      ctx.team_members = members;
    });

    return {
      project_context_id: input.project_context_id,
      registered_members_count: members.length,
      members,
    };
  }

  private extractRequirementsFromText(text: string): Requirement[] {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const reqs: Requirement[] = [];
    let reqIndex = 1;

    for (const line of lines) {
      if (/shall|must|should|system|user|allow|support|provide|require/i.test(line)) {
        reqs.push({
          id: `REQ-${String(reqIndex++).padStart(3, '0')}`,
          title: line.length > 50 ? line.substring(0, 47) + '...' : line,
          description: line,
          type: /latency|sec|performance|response time|security|scale/i.test(line)
            ? 'non_functional'
            : 'functional',
          priority: /must|critical|shall/i.test(line) ? 'high' : 'medium',
        });
      }
    }

    if (reqs.length === 0) {
      reqs.push({
        id: 'REQ-001',
        title: 'General Functional Requirements',
        description: text.substring(0, 150),
        type: 'functional',
        priority: 'high',
      });
    }

    return reqs;
  }
}
