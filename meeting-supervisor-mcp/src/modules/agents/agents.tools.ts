import { Tool, UseGuards, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { AgentsService } from './agents.service.js';
import { JWTGuard } from '../../guards/jwt.guard.js';

export class AgentsTools {
  constructor(private agentsService: AgentsService) {}

  @Tool({
    name: 'analyze_meeting',
    description: 'Summarizer Agent: extract action items and decisions from a meeting transcript',
    inputSchema: z.object({
      transcript: z.string().min(1)
    })
  })
  async analyzeMeeting(input: { transcript: string }) {
    return { keynotes: await this.agentsService.extractKeynotes(input.transcript) };
  }

  @Tool({
    name: 'analyze_task',
    description: 'Task Analyzer Agent: scores a proposed task for clarity and estimates effort before assignment',
    inputSchema: z.object({
      title: z.string(),
      description: z.string().optional()
    })
  })
  async analyzeTask(input: { title: string; description?: string }) {
    return this.agentsService.analyzeTask(input.title, input.description);
  }

  @Tool({
    name: 'suggest_meeting_slots',
    description: 'Supervisor Agent: proposes meeting times for a set of participants, flagging conflicts',
    inputSchema: z.object({
      participant_ids: z.array(z.string()).min(1),
      duration_minutes: z.number().default(30)
    })
  })
  @UseGuards(JWTGuard)
  async suggestSlots(input: { participant_ids: string[]; duration_minutes: number }) {
    return this.agentsService.suggestMeetingSlots(input.participant_ids, input.duration_minutes);
  }

  @Tool({
    name: 'review_productivity',
    description: 'Review Agent: summarizes a user’s completed-task history into productivity insights',
    inputSchema: z.object({ user_id: z.string() })
  })
  @UseGuards(JWTGuard)
  async reviewProductivity(input: { user_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Running productivity review', { user_id: input.user_id });
    return this.agentsService.reviewProductivity(input.user_id, []);
  }
}
