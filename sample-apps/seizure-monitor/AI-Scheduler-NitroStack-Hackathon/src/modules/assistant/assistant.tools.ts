import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { TaskModel } from '../../models/task.model.js';
import { HabitModel } from '../../models/habit.model.js';
import { ExpenseModel } from '../../models/expense.model.js';
import { DailySummaryModel } from '../../models/daily-summary.model.js';
import { GoogleCalendarService } from './google-calendar.js';

function toLocalISOString(date: Date): string {
  const tzo = -date.getTimezoneOffset();
  const dif = tzo >= 0 ? '+' : '-';
  const pad = (num: number) => (num < 10 ? '0' : '') + num;
  return (
    date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    dif + pad(Math.floor(Math.abs(tzo) / 60)) +
    ':' + pad(Math.abs(tzo) % 60)
  );
}

export function parseNaturalTimeblock(text: string) {
  const now = new Date();
  let baseDate = new Date(now);

  const lower = text.toLowerCase();

  if (lower.includes('tomorrow')) {
    baseDate.setDate(baseDate.getDate() + 1);
  } else if (lower.includes('tonight') || lower.includes('today')) {
    // keep today's date
  } else if (lower.includes('next week')) {
    baseDate.setDate(baseDate.getDate() + 7);
  } else {
    const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/) || text.match(/\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/);
    if (dateMatch) {
      const parsed = new Date(dateMatch[1]);
      if (!isNaN(parsed.getTime())) {
        baseDate = parsed;
      }
    }
  }

  const timeRangeRegex = /(?:at|from)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|-|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const singleTimeRegex = /(?:at|from)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;

  let startHour = 9;
  let startMin = 0;
  let endHour = 10;
  let endMin = 0;

  const rangeMatch = text.match(timeRangeRegex);
  if (rangeMatch) {
    let h1 = parseInt(rangeMatch[1], 10);
    let m1 = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
    let mer1 = rangeMatch[3]?.toLowerCase();

    let h2 = parseInt(rangeMatch[4], 10);
    let m2 = rangeMatch[5] ? parseInt(rangeMatch[5], 10) : 0;
    let mer2 = rangeMatch[6]?.toLowerCase();

    if (!mer1 && mer2) mer1 = mer2;

    if (mer1 === 'pm' && h1 < 12) h1 += 12;
    if (mer1 === 'am' && h1 === 12) h1 = 0;
    if (mer2 === 'pm' && h2 < 12) h2 += 12;
    if (mer2 === 'am' && h2 === 12) h2 = 0;

    startHour = h1;
    startMin = m1;
    endHour = h2;
    endMin = m2;
  } else {
    const singleMatch = text.match(singleTimeRegex);
    if (singleMatch) {
      let h1 = parseInt(singleMatch[1], 10);
      let m1 = singleMatch[2] ? parseInt(singleMatch[2], 10) : 0;
      let mer1 = singleMatch[3]?.toLowerCase();

      if (mer1 === 'pm' && h1 < 12) h1 += 12;
      if (mer1 === 'am' && h1 === 12) h1 = 0;

      startHour = h1;
      startMin = m1;
      endHour = (h1 + 1) % 24;
      endMin = m1;
    }
  }

  const startDate = new Date(baseDate);
  startDate.setHours(startHour, startMin, 0, 0);

  const endDate = new Date(baseDate);
  endDate.setHours(endHour, endMin, 0, 0);
  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + (startHour > endHour ? 1 : 0));
    if (endDate <= startDate) {
      endDate.setHours(startDate.getHours() + 1);
    }
  }

  let title = text
    .replace(/\b(tomorrow|today|tonight|next week)\b/gi, '')
    .replace(timeRangeRegex, '')
    .replace(singleTimeRegex, '')
    .replace(/^\s*(?:i\s+have\s+to|i\s+will|i\s+need\s+to|i\s+have\s+a|i\s+have|please|remember\s+to)\s+/gi, '')
    .replace(/^\s*(?:at|from|on|for|to)\s+/gi, '')
    .replace(/\s+(?:at|from|on|for|to)\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title || title.length < 2) {
    title = lower.includes('meeting') ? 'Meeting' : 'Scheduled Task';
  } else {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return {
    title,
    startTime: toLocalISOString(startDate),
    endTime: toLocalISOString(endDate),
    formattedTimeSlot: `${startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} | ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  };
}

export function parseExpense(text: string) {
  const expenseRegex = /(?:spent|paid|cost|\$)\s*\$?(\d+(?:\.\d{1,2})?)\s*(?:on|for)?\s*([a-zA-Z0-9\s]+)/i;
  const match = text.match(expenseRegex);
  if (!match) return null;

  const amount = parseFloat(match[1]);
  let description = match[2].trim();
  if (!description) description = 'General Expense';

  let category = 'general';
  const lower = description.toLowerCase();
  if (lower.includes('lunch') || lower.includes('dinner') || lower.includes('food') || lower.includes('coffee') || lower.includes('breakfast')) {
    category = 'food';
  } else if (lower.includes('cab') || lower.includes('uber') || lower.includes('train') || lower.includes('bus') || lower.includes('fuel') || lower.includes('gas')) {
    category = 'transport';
  } else if (lower.includes('groceries') || lower.includes('supermarket') || lower.includes('store')) {
    category = 'groceries';
  } else if (lower.includes('bill') || lower.includes('rent') || lower.includes('electric') || lower.includes('wifi')) {
    category = 'bills';
  }

  return {
    amount,
    category,
    description: description.charAt(0).toUpperCase() + description.slice(1),
    date: new Date().toISOString().split('T')[0]
  };
}

export function parseHabit(text: string) {
  const habitKeywords = [
    'meditation', 'meditate', 'read', 'reading', 'workout', 'exercise',
    'gym', 'running', 'run', 'yoga', 'water', 'journaling', 'coding', 'practice'
  ];
  const lower = text.toLowerCase();
  const foundKeyword = habitKeywords.find(k => lower.includes(k));
  if (!foundKeyword && !lower.includes('habit') && !lower.includes('completed')) {
    return null;
  }

  const name = foundKeyword ? foundKeyword.charAt(0).toUpperCase() + foundKeyword.slice(1) : 'Daily Discipline';
  return {
    name,
    frequency: 'daily' as const,
    completedDate: new Date().toISOString().split('T')[0]
  };
}

export function parseDeletionIntent(text: string): { type: 'today' | 'all' | 'specific'; targetTitle?: string } | null {
  const lower = text.toLowerCase().trim();
  if (
    lower.includes('delete all tasks for today') ||
    lower.includes('delete all my tasks for today') ||
    lower.includes('clear today\'s tasks') ||
    lower.includes('delete today\'s tasks') ||
    lower.includes('clear all tasks for today')
  ) {
    return { type: 'today' };
  }
  if (
    lower.includes('delete all tasks') ||
    lower.includes('delete all my tasks') ||
    lower.includes('clear all tasks') ||
    lower.includes('clear my tasks')
  ) {
    return { type: 'all' };
  }
  
  const specificMatch = text.match(/(?:delete|remove|clear)\s+(?:task\s+)?["']?([^"'\.\n]+)["']?/i);
  if (specificMatch && specificMatch[1]) {
    const title = specificMatch[1].trim();
    if (title && !title.toLowerCase().includes('all') && !title.toLowerCase().includes('today')) {
      return { type: 'specific', targetTitle: title };
    }
  }
  return null;
}

export function parseUnifiedInput(text: string, userId: string = 'demo-user') {
  const lines = text.split(/(?:\.|\n)+/).map(s => s.trim()).filter(Boolean);
  const textItems = lines.length > 0 ? lines : [text];

  const tasks: ReturnType<typeof TaskModel.create>[] = [];
  const expenses: ReturnType<typeof ExpenseModel.create>[] = [];
  const habits: Array<{ name: string; frequency: 'daily'; completedDate: string }> = [];
  let deletionIntent: { type: 'today' | 'all' | 'specific'; targetTitle?: string } | null = null;

  for (const item of textItems) {
    const delIntent = parseDeletionIntent(item);
    if (delIntent) {
      deletionIntent = delIntent;
      continue;
    }

    const expense = parseExpense(item);
    if (expense) {
      expenses.push(ExpenseModel.create({
        userId,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        date: expense.date
      }));
      continue;
    }

    const habit = parseHabit(item);
    if (habit && (item.toLowerCase().includes('completed') || item.toLowerCase().includes('done') || item.toLowerCase().includes('did'))) {
      habits.push(habit);
      continue;
    }

    // Default to task timeblock parsing
    const parsedTask = parseNaturalTimeblock(item);
    tasks.push(TaskModel.create({
      userId,
      title: parsedTask.title,
      description: parsedTask.formattedTimeSlot,
      category: 'planning',
      startTime: parsedTask.startTime,
      endTime: parsedTask.endTime,
      status: 'pending',
      priority: 'high',
      isTimeBlocked: true
    }));
  }

  return { tasks, expenses, habits, deletionIntent };
}

export class AssistantTools {
  @Tool({
    name: 'extract_timeblock_keywords',
    description: 'Parse a user note into structured time-block tasks.',
    inputSchema: z.object({
      text: z.string().describe('User note or transcript to parse'),
      userId: z.string().optional().describe('Optional user id')
    })
  })
  async extractTimeblockKeywords(input: { text: string; userId?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Extracting time blocks and input data', { text: input.text });

    const unified = parseUnifiedInput(input.text, input.userId ?? 'demo-user');

    let summary = '';
    if (unified.deletionIntent) {
      if (unified.deletionIntent.type === 'today') summary += 'Action: Deleting all tasks for today. ';
      else if (unified.deletionIntent.type === 'all') summary += 'Action: Deleting all tasks. ';
      else summary += `Action: Deleting task "${unified.deletionIntent.targetTitle}". `;
    }
    if (unified.tasks.length > 0) summary += `Detected ${unified.tasks.length} time-block task(s). `;
    if (unified.expenses.length > 0) summary += `Logged ${unified.expenses.length} expense item(s). `;
    if (unified.habits.length > 0) summary += `Updated ${unified.habits.length} habit streak(s).`;
    if (!summary) summary = 'No actionable items detected.';

    return {
      status: 'success',
      extractedTasks: unified.tasks,
      extractedExpenses: unified.expenses,
      extractedHabits: unified.habits,
      deletionIntent: unified.deletionIntent,
      summary: summary.trim()
    };
  }

  @Tool({
    name: 'create_calendar_event',
    description: 'Create a calendar-style event payload for the assistant.',
    inputSchema: z.object({
      title: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      userId: z.string().optional()
    })
  })
  async createCalendarEvent(input: { title: string; startTime: string; endTime: string; userId?: string; userTokens?: any }, ctx: ExecutionContext) {
    ctx.logger.info('Creating calendar event', { title: input.title });

    const task = TaskModel.create({
      userId: input.userId ?? 'demo-user',
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      status: 'pending',
      priority: 'high',
      isTimeBlocked: true
    });

    const googleCalendar = new GoogleCalendarService();
    const authUrl = googleCalendar.getAuthorizationUrl();
    const result = await googleCalendar.createEvent({
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      description: `Created from ai-scheduler for ${input.userId ?? 'demo-user'}`
    }, input.userTokens);

    return {
      status: result.status,
      event: task,
      googleCalendar: result,
      authUrl,
      message: result.message + (authUrl ? `\nOAuth URL: ${authUrl}` : '')
    };
  }

  @Tool({
    name: 'reschedule_conflicts',
    description: 'Suggest a rescheduled plan for conflicting or overdue tasks.',
    inputSchema: z.object({
      tasks: z.array(z.any()),
      userId: z.string().optional()
    })
  })
  async rescheduleConflicts(input: { tasks: Array<Record<string, unknown>>; userId?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Rescheduling conflicts', { count: input.tasks.length });

    // Sort tasks chronologically by startTime
    const sorted = [...input.tasks].sort((a: any, b: any) => {
      const t1 = a.startTime ? new Date(a.startTime).getTime() : 0;
      const t2 = b.startTime ? new Date(b.startTime).getTime() : 0;
      return t1 - t2;
    });

    const suggestions: Array<Record<string, unknown>> = [];
    let previousEnd: number | null = null;
    let rescheduledCount = 0;

    for (const task of sorted) {
      let startMs = task.startTime ? new Date(task.startTime as string).getTime() : Date.now();
      let endMs = task.endTime ? new Date(task.endTime as string).getTime() : startMs + 60 * 60 * 1000;
      const durationMs = Math.max(endMs - startMs, 30 * 60 * 1000);

      // Detect collision with previous task
      if (previousEnd !== null && startMs < previousEnd) {
        startMs = previousEnd; // Stagger start time to previous task's end
        endMs = startMs + durationMs;
        rescheduledCount++;
      }

      const newStartISO = toLocalISOString(new Date(startMs));
      const newEndISO = toLocalISOString(new Date(endMs));
      const startDate = new Date(startMs);
      const endDate = new Date(endMs);
      const formattedSlot = `${startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} | ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      suggestions.push({
        ...task,
        startTime: newStartISO,
        endTime: newEndISO,
        description: formattedSlot,
        status: previousEnd !== null && task.startTime !== newStartISO ? 'rescheduled' : task.status
      });

      previousEnd = endMs;
    }

    return {
      status: 'success',
      suggestions,
      rescheduledCount,
      summary: rescheduledCount > 0 
        ? `Resolved ${rescheduledCount} conflicting time slot(s) by staggering task schedules.` 
        : 'No task collisions detected. All schedules are clear.'
    };
  }
}

