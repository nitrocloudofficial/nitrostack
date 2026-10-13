import { ToolDecorator as Tool, Widget, Cache, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES_PATH = path.join(process.cwd(), 'src', 'resources');

function loadAttendance() {
  const filePath = path.join(RESOURCES_PATH, 'attendance.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function computeBunkSafety(subject: any, minimumRequired: number) {
  const { totalClasses, attended } = subject;
  // How many more classes are remaining (estimate 30 more)
  const remainingClasses = 30;

  // Max classes they can miss in total to stay above minimum
  const totalFuture = totalClasses + remainingClasses;
  const minAttend = Math.ceil((minimumRequired / 100) * totalFuture);
  const canMissTotal = (totalClasses + remainingClasses) - minAttend;
  const alreadyMissed = totalClasses - attended;
  const safeToMissNow = Math.max(0, canMissTotal - alreadyMissed);

  // How many more classes needed to reach minimum
  let classesNeededNow = 0;
  if (subject.percentage < minimumRequired) {
    classesNeededNow = Math.ceil(
      (minimumRequired * totalClasses - 100 * attended) / (100 - minimumRequired)
    );
  }

  return { safeToMissNow, classesNeededNow };
}

export class AttendanceTools {
  @Tool({
    name: 'attendance_calculator',
    description: `Calculate the student's attendance percentage and bunk safety for all subjects or a specific subject.
      Use this tool when the student asks: "What is my attendance?", "Can I bunk tomorrow?", "How many classes can I skip?", "Am I safe to miss [subject] class?", "What is my attendance in DBMS?".
      Returns percentage, status (good/borderline/at-risk/danger), and bunk safety prediction.`,
    inputSchema: z.object({
      subject: z.string().optional()
        .describe('Optional: specific subject name or code to check, e.g. "DBMS", "CS502", "Operating Systems". Leave empty for all subjects.'),
    }),
    examples: {
      request: { subject: 'DBMS' },
      response: {
        subject: 'Database Management Systems',
        percentage: 73.08,
        status: 'at-risk',
        safeToMiss: 0,
        recommendation: 'Do NOT miss any more DBMS classes. Attend the next 3 classes to be safe.'
      }
    }
  })
  @Widget('attendance-tracker')
  @Cache({ ttl: 120 })
  async attendanceCalculator(input: { subject?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Calculating attendance', { subject: input.subject });

    const data = loadAttendance();
    const { minimumRequired } = data;

    let subjects = data.subjects;

    if (input.subject) {
      const query = input.subject.toLowerCase();
      subjects = subjects.filter(
        (s: any) =>
          s.name.toLowerCase().includes(query) ||
          s.code.toLowerCase().includes(query)
      );
    }

    const enrichedSubjects = subjects.map((s: any) => {
      const { safeToMissNow, classesNeededNow } = computeBunkSafety(s, minimumRequired);

      let recommendation: string;
      if (s.percentage >= 90) {
        recommendation = `Excellent attendance! You can safely miss up to ${safeToMissNow} more classes.`;
      } else if (s.percentage >= 85) {
        recommendation = `Good attendance. You have ${safeToMissNow} safe bunk(s) remaining.`;
      } else if (s.percentage >= 75) {
        recommendation = `Borderline attendance. You can miss at most ${safeToMissNow} class(es). Be careful!`;
      } else if (s.percentage >= 70) {
        recommendation = `⚠️ At risk! You must attend the next ${classesNeededNow} consecutive classes to reach 75%.`;
      } else {
        recommendation = `🚨 Danger zone! You need to attend ${classesNeededNow} consecutive classes. Do NOT miss any more.`;
      }

      return {
        ...s,
        safeToMiss: safeToMissNow,
        classesNeeded: classesNeededNow,
        recommendation,
        minimumRequired,
      };
    });

    const atRiskCount = enrichedSubjects.filter(
      (s: any) => s.status === 'at-risk' || s.status === 'danger'
    ).length;
    const borderlineCount = enrichedSubjects.filter(
      (s: any) => s.status === 'borderline'
    ).length;

    return {
      student: data.student,
      minimumRequired,
      subjects: enrichedSubjects,
      overall: data.overall,
      summary: {
        atRiskSubjects: atRiskCount,
        borderlineSubjects: borderlineCount,
        goodSubjects: enrichedSubjects.length - atRiskCount - borderlineCount,
        alert:
          atRiskCount > 0
            ? `⚠️ You have ${atRiskCount} subject(s) below the minimum attendance requirement!`
            : borderlineCount > 0
            ? `⚡ You have ${borderlineCount} subject(s) at borderline attendance. Stay consistent.`
            : '✅ Your overall attendance is healthy.',
      },
    };
  }
}
