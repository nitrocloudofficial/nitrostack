import { ToolDecorator as Tool, Widget, InitialTool, Cache, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES_PATH = path.join(process.cwd(), 'src', 'resources');

function loadJSON(filename: string) {
  const filePath = path.join(RESOURCES_PATH, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export class StudyCoachTools {
  @Tool({
    name: 'get_daily_study_plan',
    description: `Generate a proactive, personalized daily study plan for the student.
      This is the SMART STUDY COACH — the standout feature of CampusPilot AI.
      Use this tool when the student asks: "Plan my day", "What should I study today?", "Give me my daily plan", "Morning briefing", "What should I focus on?".
      This tool autonomously analyzes assignments, attendance, exams, and today's timetable to generate an intelligent, time-blocked study plan.
      It proactively identifies risks (low attendance, upcoming deadlines) without the student having to ask explicitly.`,
    inputSchema: z.object({
      includeBreaks: z.boolean().default(true)
        .describe('Whether to include rest breaks in the study schedule. Recommended for long study sessions.'),
      studyHoursAvailable: z.number().min(1).max(12).default(6)
        .describe('Total hours available for studying today (excluding class time). Defaults to 6 hours.'),
    }),
    examples: {
      request: { includeBreaks: true, studyHoursAvailable: 6 },
      response: {
        greeting: 'Good morning, Alex Sharma!',
        urgentAlerts: ['DBMS assignment due tomorrow!', 'TOC attendance is 69% - danger zone!'],
        studyPlan: [{ time: '7:00-9:00 AM', subject: 'DBMS', task: 'Complete ER Diagram assignment' }]
      }
    }
  })
  @InitialTool()
  @Widget('study-coach')
  @Cache({
    ttl: 1800,
    key: () => {
      const today = new Date().toISOString().split('T')[0];
      return `study-coach:${today}`;
    },
  })
  async getDailyStudyPlan(
    input: { includeBreaks?: boolean; studyHoursAvailable?: number } | undefined,
    ctx: ExecutionContext
  ) {
    const includeBreaks = input?.includeBreaks ?? true;
    const studyHoursAvailable = input?.studyHoursAvailable ?? 6;
    ctx.logger.info('Generating personalized daily study plan', { includeBreaks, studyHoursAvailable });

    // Load all data sources
    const assignmentsData = loadJSON('assignments.json');
    const timetableData = loadJSON('timetable.json');
    const attendanceData = loadJSON('attendance.json');

    const today = new Date();
    const todayName = DAYS[today.getDay()];
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
    const hour = today.getHours();

    // --- 1. Greeting ---
    const greeting =
      hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    // --- 2. Analyze Assignments ---
    const pendingAssignments = assignmentsData.assignments.filter(
      (a: any) => a.status === 'pending' || a.status === 'in-progress'
    );

    const urgentAssignments = pendingAssignments.filter((a: any) => {
      const due = new Date(a.dueDate);
      const days = Math.ceil((due.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);
      today.setHours(hour); // restore
      return days <= 2;
    });

    const thisWeekAssignments = pendingAssignments.filter((a: any) => {
      const due = new Date(a.dueDate);
      const days = Math.ceil((due.getTime() - new Date(todayStr).getTime()) / 86400000);
      return days > 2 && days <= 7;
    });

    // --- 3. Analyze Attendance ---
    const atRiskSubjects = attendanceData.subjects.filter(
      (s: any) => s.status === 'danger' || s.status === 'at-risk'
    );
    const borderlineSubjects = attendanceData.subjects.filter(
      (s: any) => s.status === 'borderline'
    );

    // --- 4. Today's Classes ---
    const todayClasses = (timetableData.schedule[todayName] || []).filter(
      (p: any) => p.type !== 'break'
    );

    // --- 5. Upcoming Exams ---
    const upcomingExams = assignmentsData.exams.filter((e: any) => {
      const examDate = new Date(e.date);
      const days = Math.ceil((examDate.getTime() - new Date(todayStr).getTime()) / 86400000);
      return days > 0 && days <= 14;
    });

    // --- 6. Build Urgent Alerts ---
    const alerts: string[] = [];

    if (urgentAssignments.length > 0) {
      urgentAssignments.forEach((a: any) => {
        const due = new Date(a.dueDate);
        const days = Math.ceil((due.getTime() - new Date(todayStr).getTime()) / 86400000);
        if (days === 0) alerts.push(`🔴 ${a.subject}: "${a.title}" is due TODAY!`);
        else if (days === 1) alerts.push(`🟠 ${a.subject}: "${a.title}" is due TOMORROW!`);
        else alerts.push(`🟡 ${a.subject}: "${a.title}" is due in ${days} days.`);
      });
    }

    atRiskSubjects.forEach((s: any) => {
      alerts.push(
        `⚠️ ${s.name} attendance is ${s.percentage.toFixed(1)}% — ${s.status === 'danger' ? 'DANGER ZONE! Attend all classes!' : 'At risk. Do not miss any more classes.'}`
      );
    });

    if (todayClasses.length === 0) {
      alerts.push(`📅 No classes today (${todayName}). Great time for self-study!`);
    } else {
      const atRiskToday = todayClasses.filter((c: any) =>
        atRiskSubjects.some((r: any) => r.name === c.subject)
      );
      if (atRiskToday.length > 0) {
        atRiskToday.forEach((c: any) =>
          alerts.push(`🚫 Do NOT skip ${c.subject} class at ${c.time} today (low attendance)!`)
        );
      }
    }

    upcomingExams.forEach((e: any) => {
      const days = Math.ceil((new Date(e.date).getTime() - new Date(todayStr).getTime()) / 86400000);
      if (days <= 7)
        alerts.push(`📝 ${e.subject} ${e.examType} is in ${days} days (${e.date}). Start revising: ${e.syllabus.join(', ')}.`);
    });

    // --- 7. Build Time-Blocked Study Plan ---
    const studyBlocks: any[] = [];
    const availableMinutes = studyHoursAvailable * 60;
    let usedMinutes = 0;
    let blockStart = 6; // 6 AM start

    const addBlock = (subject: string, task: string, minutes: number, priority: string) => {
      if (usedMinutes + minutes > availableMinutes) return;
      const startH = Math.floor(blockStart);
      const startM = Math.round((blockStart - startH) * 60);
      const endTotal = blockStart + minutes / 60;
      const endH = Math.floor(endTotal);
      const endM = Math.round((endTotal - endH) * 60);
      studyBlocks.push({
        time: `${startH}:${startM.toString().padStart(2, '0')}–${endH}:${endM.toString().padStart(2, '0')}`,
        subject,
        task,
        duration: `${minutes} min`,
        priority,
      });
      blockStart = endTotal;
      usedMinutes += minutes;
      if (includeBreaks && usedMinutes % 120 < 30 && usedMinutes > 0) {
        const bStart = blockStart;
        const bEnd = blockStart + 0.25; // 15 min break
        studyBlocks.push({
          time: `${Math.floor(bStart)}:${Math.round((bStart % 1) * 60).toString().padStart(2, '0')}–${Math.floor(bEnd)}:${Math.round((bEnd % 1) * 60).toString().padStart(2, '0')}`,
          subject: '☕ Break',
          task: 'Rest, hydrate, and relax.',
          duration: '15 min',
          priority: 'break',
        });
        blockStart = bEnd;
      }
    };

    // Priority 1: Today's urgent assignments
    urgentAssignments.forEach((a: any) => {
      addBlock(a.subject, `Complete: ${a.title}`, a.priority === 'high' ? 90 : 60, 'critical');
    });

    // Priority 2: At-risk subject revision (danger zone subjects)
    atRiskSubjects.forEach((s: any) => {
      addBlock(s.name, `Revision: Focus on weak areas to improve exam marks.`, 60, 'high');
    });

    // Priority 3: Upcoming exams
    upcomingExams.slice(0, 2).forEach((e: any) => {
      addBlock(
        e.subject,
        `Exam Prep: Revise ${e.syllabus.join(', ')}`,
        75,
        'high'
      );
    });

    // Priority 4: This-week assignments
    thisWeekAssignments.slice(0, 2).forEach((a: any) => {
      addBlock(a.subject, `Work on: ${a.title}`, 60, 'medium');
    });

    // Fill remaining time with general revision
    if (usedMinutes < availableMinutes - 30) {
      const remainingSubjects = attendanceData.subjects.filter(
        (s: any) => s.status === 'good' || s.status === 'satisfactory'
      );
      if (remainingSubjects.length > 0) {
        addBlock(
          remainingSubjects[0].name,
          'Optional revision: Stay ahead with regular study.',
          30,
          'low'
        );
      }
    }

    // --- 8. Motivational Quote ---
    const quotes = [
      '"The secret of getting ahead is getting started." – Mark Twain',
      '"Success is the sum of small efforts, repeated day in and day out." – Robert Collier',
      '"Education is the most powerful weapon which you can use to change the world." – Nelson Mandela',
      '"The expert in anything was once a beginner." – Helen Hayes',
      '"Hard work beats talent when talent doesn\'t work hard." – Tim Notke',
    ];
    const quote = quotes[today.getDate() % quotes.length];

    return {
      greeting: `${greeting}, ${assignmentsData.student.name}! 👋`,
      date: todayStr,
      dayOfWeek: todayName,
      student: assignmentsData.student,

      // Summary metrics
      summary: {
        pendingAssignments: pendingAssignments.length,
        urgentDeadlines: urgentAssignments.length,
        atRiskSubjects: atRiskSubjects.length,
        upcomingExams: upcomingExams.length,
        classesToday: todayClasses.length,
        overallAttendance: `${attendanceData.overall.overallPercentage.toFixed(1)}%`,
      },

      // Alerts (proactive intelligence)
      alerts,

      // Today's class schedule
      todayClasses: todayClasses.map((c: any) => ({
        time: c.time,
        subject: c.subject,
        room: c.room,
        type: c.type,
        attendanceStatus: attendanceData.subjects.find((s: any) => s.name === c.subject)?.status || 'unknown',
      })),

      // Time-blocked study plan
      studyPlan: studyBlocks,
      totalStudyTime: `${Math.floor(usedMinutes / 60)}h ${usedMinutes % 60}m`,

      // Insights
      insights: {
        topPriority: urgentAssignments[0]?.subject || atRiskSubjects[0]?.name || 'No urgent items — keep consistent study habits.',
        attendanceRisk: atRiskSubjects.map((s: any) => s.name),
        upcomingExams: upcomingExams.map((e: any) => ({ subject: e.subject, date: e.date })),
      },
      // Full assignment list for the assignments tab
      assignments: pendingAssignments.map((a: any) => ({
        id: a.id,
        title: a.title,
        subject: a.subject,
        dueDate: a.dueDate,
        priority: a.priority,
        type: a.type || 'assignment',
      })),

      // Full attendance list for the attendance tab
      attendanceSubjects: attendanceData.subjects.map((s: any) => ({
        code: s.code,
        name: s.name,
        percentage: s.percentage,
        status: s.status,
        attended: s.attended,
        totalClasses: s.totalClasses,
      })),

      motivationalQuote: quote,
    };
  }
}
