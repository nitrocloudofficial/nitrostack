import { ToolDecorator as Tool, Widget, InitialTool, Cache, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES_PATH = path.join(process.cwd(), 'src', 'resources');

function loadAssignments() {
  const filePath = path.join(RESOURCES_PATH, 'assignments.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

export class AssignmentTools {
  @Tool({
    name: 'get_assignments',
    description: `Retrieve the student's assignment list. 
      Use this tool when the student asks about: assignments, homework, tasks due, pending work, submission deadlines.
      Returns assignments filtered by status and/or subject. Always call this when the student asks "what assignments are due?" or "show my homework".`,
    inputSchema: z.object({
      status: z.enum(['all', 'pending', 'completed', 'in-progress']).default('pending')
        .describe('Filter by assignment status. Use "pending" for due assignments, "completed" for done ones, "all" for everything.'),
      subject: z.string().optional()
        .describe('Optional: filter by subject name or code, e.g. "DBMS", "CS501", "Operating Systems"'),
    }),
    examples: {
      request: { status: 'pending', subject: 'DBMS' },
      response: {
        totalAssignments: 1,
        assignments: [{ id: 'A001', subject: 'Database Management Systems', title: 'ER Diagram', dueDate: '2026-07-26', priority: 'high' }]
      }
    }
  })
  @Widget('assignment-dashboard')
  @Cache({ ttl: 60 })
  async getAssignments(input: { status?: string; subject?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching assignments', { status: input?.status, subject: input?.subject });

    const data = loadAssignments();
    let assignments = data.assignments;

    const statusFilter = input?.status || 'pending';

    // Filter by status
    if (statusFilter !== 'all') {
      assignments = assignments.filter((a: any) => a.status === statusFilter);
    }

    // Filter by subject if provided
    if (input.subject) {
      const query = input.subject.toLowerCase();
      assignments = assignments.filter(
        (a: any) =>
          a.subject.toLowerCase().includes(query) ||
          a.subjectCode.toLowerCase().includes(query)
      );
    }

    // Sort by due date ascending
    assignments.sort(
      (a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    // Compute urgency tags
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    assignments = assignments.map((a: any) => {
      const due = new Date(a.dueDate);
      due.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let urgency: string;
      if (daysUntilDue < 0) urgency = 'overdue';
      else if (daysUntilDue === 0) urgency = 'due-today';
      else if (daysUntilDue <= 2) urgency = 'due-soon';
      else if (daysUntilDue <= 7) urgency = 'this-week';
      else urgency = 'upcoming';
      return { ...a, daysUntilDue, urgency };
    });

    return {
      student: data.student,
      totalAssignments: assignments.length,
      filterApplied: { status: statusFilter, subject: input?.subject || 'all' },
      assignments,
      exams: data.exams,
      summary: {
        overdue: assignments.filter((a: any) => a.urgency === 'overdue').length,
        dueToday: assignments.filter((a: any) => a.urgency === 'due-today').length,
        dueSoon: assignments.filter((a: any) => a.urgency === 'due-soon').length,
        thisWeek: assignments.filter((a: any) => a.urgency === 'this-week').length,
        upcoming: assignments.filter((a: any) => a.urgency === 'upcoming').length,
      },
    };
  }
}
