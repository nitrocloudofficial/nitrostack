import { ToolDecorator as Tool, Widget, Cache, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES_PATH = path.join(process.cwd(), 'src', 'resources');

function loadTimetable() {
  const filePath = path.join(RESOURCES_PATH, 'timetable.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export class TimetableTools {
  @Tool({
    name: 'get_timetable',
    description: `Get the student's class schedule for a specific day or today.
      Use this tool when the student asks: "What classes do I have today?", "Show my timetable", "What's my schedule for Monday?", "Do I have any classes tomorrow?".
      Returns the complete schedule with period times, subject names, room numbers, and faculty.`,
    inputSchema: z.object({
      day: z.enum(['today', 'tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
        .default('today')
        .describe('Day to fetch the schedule for. Use "today" or "tomorrow" for relative days, or a specific weekday name.'),
    }),
    examples: {
      request: { day: 'today' },
      response: {
        day: 'Monday',
        date: '2026-07-28',
        totalPeriods: 7,
        schedule: [{ period: 1, time: '9:00-9:55', subject: 'DBMS', room: 'LH-301' }]
      }
    }
  })
  @Widget('timetable-view')
  @Cache({ ttl: 300 })
  async getTimetable(input: { day: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching timetable', { day: input.day });

    const data = loadTimetable();
    const today = new Date();
    let targetDayIndex = today.getDay(); // 0=Sunday

    if (input.day === 'today') {
      targetDayIndex = today.getDay();
    } else if (input.day === 'tomorrow') {
      targetDayIndex = (today.getDay() + 1) % 7;
    } else {
      targetDayIndex = DAYS.indexOf(input.day);
    }

    const dayName = DAYS[targetDayIndex];
    const schedule = data.schedule[dayName] || [];

    const lectures = schedule.filter((p: any) => p.type === 'lecture');
    const labs = schedule.filter((p: any) => p.type === 'lab');
    const activePeriods = schedule.filter((p: any) => p.type !== 'break');

    // Compute target date
    const targetDate = new Date(today);
    if (input.day === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (input.day !== 'today') {
      const diff = (targetDayIndex - today.getDay() + 7) % 7;
      targetDate.setDate(targetDate.getDate() + diff);
    }

    return {
      student: data.student,
      day: dayName,
      date: targetDate.toISOString().split('T')[0],
      isToday: dayName === DAYS[today.getDay()],
      totalPeriods: activePeriods.length,
      totalLectures: lectures.length,
      totalLabs: labs.length,
      schedule,
      firstClass: activePeriods[0] || null,
      lastClass: activePeriods[activePeriods.length - 1] || null,
      subjects: [...new Set(activePeriods.map((p: any) => p.subject))],
      message:
        schedule.length === 0
          ? `No classes scheduled for ${dayName}. Enjoy your day off! 🎉`
          : `You have ${activePeriods.length} class${activePeriods.length !== 1 ? 'es' : ''} on ${dayName}.`,
    };
  }
}
