import { Injectable } from '@nitrostack/core';
import { BrainService } from '../brain/brain.service.js';

export interface Keynote {
  type: 'action_item' | 'decision';
  text: string;
  owner?: string;
}

export interface TaskAnalysis {
  clarity_score: number;
  effort_estimate: string;
  notes: string;
}

/**
 * The agentic layer (plan.md Section 3.B): Supervisor, Summarizer,
 * Review, and Task Analyzer. Each method is real orchestration shape
 * with the LLM call stubbed — swap the throw for a call to whichever
 * model the Multi-Model Hub routes to (see .env.example).
 */
@Injectable()
export class AgentsService {
  constructor(private brainService: BrainService) {}

  /** Summarizer Agent: transcript -> action items + decisions. */
  async extractKeynotes(transcript: string): Promise<Keynote[]> {
    const model = process.env.MODEL_LONG_CONTEXT_ANALYSIS ?? 'gemini-1.5-pro';
    // TODO(Phase 2): call `model` with the transcript, parse structured
    // action items / decisions out of the response.
    throw new Error(`extractKeynotes not implemented (would call ${model})`);
  }

  /** Task Analyzer Agent: reviews a proposed task before it's assigned. */
  async analyzeTask(title: string, description?: string): Promise<TaskAnalysis> {
    const model = process.env.MODEL_TASK_ANALYSIS ?? 'claude-3-5-sonnet';
    // TODO(Phase 3): call `model`, score clarity 0-1, estimate effort.
    throw new Error(`analyzeTask not implemented (would call ${model})`);
  }

  /** Supervisor Agent: proposes meeting times, flags calendar conflicts. */
  async suggestMeetingSlots(participantIds: string[], durationMinutes: number) {
    const context = await this.brainService.queryContext(`scheduling context for ${participantIds.join(',')}`);
    // TODO(Phase 4): combine `context` with live calendar availability
    // (see modules/calendar) to propose non-conflicting slots.
    throw new Error('suggestMeetingSlots not yet implemented');
  }

  /** Review Agent: turns completed-task history into productivity insights. */
  async reviewProductivity(userId: string, completedTasks: Array<{ title: string; due_date?: string }>) {
    // TODO(Phase 3/4): summarize patterns (on-time rate, common denial
    // reasons, etc.) via an LLM call.
    throw new Error('reviewProductivity not yet implemented');
  }
}
