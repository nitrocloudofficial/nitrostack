import { ToolDecorator as Tool, Widget, UseMiddleware, UsePipes, ExecutionContext, z } from '@nitrostack/core';
import { LoggingMiddleware, ValidationPipe } from '../middleware/logger.middleware.js';

/**
 * AI Project Planner & Task Generator
 *
 * Parses project details into structured milestones/tasks (generate_project_plan)
 * and generates+assigns standalone task lists from a requirements list (generate_tasks).
 */

const PHASE_TEMPLATES = [
  { title: 'Planning & Research', weight: 1, taskVerbs: ['Define scope for', 'Research approach for', 'Write requirements doc for'] },
  { title: 'Design & Architecture', weight: 1, taskVerbs: ['Design architecture for', 'Create wireframes/schema for', 'Review design of'] },
  { title: 'Development', weight: 3, taskVerbs: ['Implement', 'Build API for', 'Wire up UI for'] },
  { title: 'Testing & QA', weight: 1.5, taskVerbs: ['Write tests for', 'Fix bugs found in', 'Run QA pass on'] },
  { title: 'Deployment & Documentation', weight: 1, taskVerbs: ['Prepare deployment for', 'Write docs for', 'Demo'] }
];

/**
 * Some MCP clients render a `string[]` form field as a single text input and
 * split the typed value into individual characters instead of separate array
 * items (e.g. typing "rushil" arrives here as ["r","u","s","h","i","l"]).
 * Detect that shape and reassemble it into the single name that was actually
 * typed; otherwise just trim/drop blanks from a normal array or comma/newline
 * separated string.
 */
function normalizeTeamMembers(raw: unknown): string[] | undefined {
  if (raw == null) return undefined;

  if (Array.isArray(raw)) {
    const items = raw.map((v) => String(v));
    if (items.length > 1 && items.every((s) => s.length === 1)) {
      return [items.join('')];
    }
    return items.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  if (typeof raw === 'string') {
    return raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  return undefined;
}

/**
 * Studio's form for a `string[]` field can submit the raw typed value as a
 * plain string instead of an array (e.g. `requirements: "photo and editor"`
 * rather than `["photo and editor"]`). Accept both shapes so the tool never
 * throws on `.flatMap`/`.length` calls further down.
 */
function normalizeRequirements(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter((s) => s.length > 0);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

function buildTeamMembers(teamSize: number, provided?: string[]): string[] {
  if (provided && provided.length > 0) return provided;
  return Array.from({ length: Math.max(1, teamSize) }, (_, i) => `Member ${i + 1}`);
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export class PlannerTools {
  @Tool({
    name: 'generate_project_plan',
    description: 'Parses a project description and team size into structured milestones with assigned task items, plus a dashboard-ready progress summary.',
    inputSchema: z.object({
      project_name: z.string().describe('Name of the project'),
      project_description: z.string().describe('Short description of what the project does'),
      team_size: z.number().int().min(1).describe('Number of people on the team'),
      duration_weeks: z.number().int().min(1).max(52).optional().describe('Total project duration in weeks (default 4)'),
      team_members: z.array(z.string()).optional().describe('Optional explicit list of team member names')
    }),
    examples: {
      request: {
        project_name: 'Campus Event Finder',
        project_description: 'An app that helps students discover campus events',
        team_size: 4,
        duration_weeks: 6
      },
      response: {
        project_name: 'Campus Event Finder',
        milestones: [],
        dashboard: { totalTasks: 15, completedTasks: 0, pendingTasks: 15, completionPercentage: 0, upcomingDeadlines: [] }
      }
    }
  })
  @Widget('dashboard')
  @UseMiddleware(LoggingMiddleware)
  @UsePipes(ValidationPipe)
  async generateProjectPlan(input: any, ctx: ExecutionContext) {
    const durationWeeks = input.duration_weeks ?? 4;
    const team = buildTeamMembers(input.team_size, normalizeTeamMembers(input.team_members));

    const totalWeight = PHASE_TEMPLATES.reduce((sum, p) => sum + p.weight, 0);
    const now = new Date();

    // Cumulative week boundaries, proportional to each phase's weight and
    // scaled to durationWeeks. Rounding the *cumulative* fraction (rather
    // than each phase's own share) guarantees the boundaries land exactly on
    // durationWeeks regardless of how many weeks were requested — the old
    // per-phase `Math.max(1, ...)` floor forced a minimum of 1 week per of
    // the 5 phases, so short durations always overflowed to ~6 weeks.
    let cumulativeWeight = 0;
    const boundaries = [0];
    for (const phase of PHASE_TEMPLATES) {
      cumulativeWeight += phase.weight;
      boundaries.push(Math.round((cumulativeWeight / totalWeight) * durationWeeks));
    }
    boundaries[boundaries.length - 1] = durationWeeks;
    for (let i = 1; i < boundaries.length; i++) {
      boundaries[i] = Math.max(boundaries[i], boundaries[i - 1]);
    }

    let memberIndex = 0;
    let taskCounter = 0;

    const milestones = PHASE_TEMPLATES.map((phase, phaseIdx) => {
      const milestoneStartWeek = boundaries[phaseIdx];
      const milestoneEndWeek = boundaries[phaseIdx + 1];

      const tasks = phase.taskVerbs.map((verb) => {
        taskCounter += 1;
        const assignee = team[memberIndex % team.length];
        memberIndex += 1;
        return {
          id: `M${phaseIdx + 1}-T${taskCounter}`,
          title: `${verb} ${input.project_name}`,
          assignee,
          status: 'pending' as const,
          dueDate: addDays(now, milestoneEndWeek * 7)
        };
      });

      // Clamp the display range to [1, durationWeeks] so a zero-length phase
      // (only possible when durationWeeks is smaller than the phase count)
      // never labels itself past the requested end date.
      const labelStart = Math.min(milestoneStartWeek + 1, durationWeeks);
      const labelEnd = Math.max(labelStart, milestoneEndWeek);

      return {
        id: `M${phaseIdx + 1}`,
        title: phase.title,
        weekRange: `Week ${labelStart}-${labelEnd}`,
        tasks
      };
    });

    const allTasks = milestones.flatMap((m) => m.tasks);
    const upcomingDeadlines = milestones.map((m) => ({
      milestone: m.title,
      dueDate: m.tasks[m.tasks.length - 1]?.dueDate,
      taskCount: m.tasks.length
    }));

    ctx.logger.info('Generated project plan', {
      project: input.project_name,
      milestones: milestones.length,
      tasks: allTasks.length
    });

    return {
      project_name: input.project_name,
      project_description: input.project_description,
      team_size: input.team_size,
      team_members: team,
      duration_weeks: durationWeeks,
      milestones,
      dashboard: {
        totalTasks: allTasks.length,
        completedTasks: 0,
        pendingTasks: allTasks.length,
        completionPercentage: 0,
        upcomingDeadlines
      }
    };
  }

  @Tool({
    name: 'generate_tasks',
    description: 'Automatically creates and assigns project tasks based on a list of requirements/features and team size.',
    inputSchema: z.object({
      project_name: z.string().describe('Name of the project'),
      requirements: z.array(z.string()).min(1).describe('List of features/requirements to break into tasks'),
      team_size: z.number().int().min(1).describe('Number of people on the team'),
      team_members: z.array(z.string()).optional().describe('Optional explicit list of team member names')
    }),
    examples: {
      request: {
        project_name: 'Campus Event Finder',
        requirements: ['User login', 'Event search', 'RSVP flow'],
        team_size: 3
      },
      response: {
        project_name: 'Campus Event Finder',
        tasks: [],
        summary: { total: 9, completed: 0, pending: 9, completionPercentage: 0 }
      }
    }
  })
  @Widget('task-list')
  @UseMiddleware(LoggingMiddleware)
  @UsePipes(ValidationPipe)
  async generateTasks(input: any, ctx: ExecutionContext) {
    // Always resolve to a valid, widget-shaped payload (tasks: [], summary
    // object) even on bad input — a thrown error here would otherwise reach
    // the MCP layer's catch block, which returns a response with NO
    // structuredContent at all, permanently stranding the task-list widget
    // (it never receives an object it can render, so its loading guard never
    // clears).
    try {
      const requirements = normalizeRequirements(input?.requirements);
      if (requirements.length === 0) {
        throw new Error('At least one requirement is required to generate tasks');
      }

      const team = buildTeamMembers(input.team_size, normalizeTeamMembers(input.team_members));
      const now = new Date();

      const verbs = ['Implement', 'Test', 'Document'];
      const priorities = ['high', 'medium', 'low'] as const;

      let memberIndex = 0;
      const tasks = requirements.flatMap((requirement: string, reqIdx: number) =>
        verbs.map((verb, verbIdx) => {
          const assignee = team[memberIndex % team.length];
          memberIndex += 1;
          return {
            id: `T${reqIdx + 1}-${verbIdx + 1}`,
            title: `${verb} ${requirement}`,
            requirement,
            assignee,
            status: 'pending' as const,
            priority: priorities[verbIdx % priorities.length],
            dueDate: addDays(now, (reqIdx + 1) * 3 + verbIdx)
          };
        })
      );

      ctx.logger.info('Generated tasks', {
        project: input.project_name,
        requirements: requirements.length,
        tasks: tasks.length
      });

      return {
        project_name: input.project_name,
        team_members: team,
        tasks,
        summary: {
          total: tasks.length,
          completed: 0,
          pending: tasks.length,
          completionPercentage: 0
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.error('generate_tasks failed, returning empty task list', { error: message });
      return {
        project_name: input?.project_name ?? 'Untitled Project',
        team_members: [],
        tasks: [],
        summary: { total: 0, completed: 0, pending: 0, completionPercentage: 0 },
        error: message
      };
    }
  }
}
