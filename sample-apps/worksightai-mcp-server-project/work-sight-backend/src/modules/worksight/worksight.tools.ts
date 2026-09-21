import { ControllerDecorator as Controller, ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000/api';

@Controller()
export class WorkSightTools {
  /**
   * 1. Live Camera AI Dashboard Widget (Strict Real-Time Data from DB)
   */
  @Tool({
    name: 'get_live_camera_dashboard',
    description: 'Displays an interactive workplace interface with live camera AI feed on top and all real-time analytics, roster, phone alerts, and break controls below it.',
    inputSchema: z.object({}),
  })
  @Widget('live-camera-dashboard')
  async getLiveCameraDashboard(input?: any, ctx?: ExecutionContext) {
    try {
      const response = await fetch(`${PYTHON_API_URL}/dashboard/live`, {
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) {
        throw new Error(`Python API returned status ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      return {
        error: `Python API Unreachable: ${error.message}. Please start Python API server with 'python app.py' in api folder.`,
        summary: { total: 0, present: 0, absent: 0, onBreak: 0, phoneAlerts: 0, totalBreakMinutes: 0, focusScore: 0 },
        students: [],
        alerts: [],
        activities: [],
      };
    }
  }

  /**
   * 2. Live Attendance Summary Widget
   */
  @Tool({
    name: 'get_attendance_summary',
    description: 'Get real-time workspace attendance, focus score, phone alert counts, and break time metrics directly from SQLite database.',
    inputSchema: z.object({}),
  })
  @Widget('attendance-summary')
  async getAttendanceSummary(input?: any, ctx?: ExecutionContext) {
    try {
      const response = await fetch(`${PYTHON_API_URL}/attendance/summary`, {
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) {
        throw new Error(`Python API returned status ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      return {
        error: `Python API Unreachable: ${error.message}`,
        total_students: 0,
        present_count: 0,
        focus_score: 0,
        phone_alerts_count: 0,
        total_break_minutes: 0,
      };
    }
  }

  /**
   * 3. Live Dashboard Widget
   */
  @Tool({
    name: 'get_live_dashboard',
    description: 'Fetch complete unified live dashboard data from database.',
    inputSchema: z.object({}),
  })
  @Widget('dashboard')
  async getLiveDashboard(input?: any, ctx?: ExecutionContext) {
    return await this.getLiveCameraDashboard(input, ctx);
  }

  /**
   * 4. Phone Alerts Widget
   */
  @Tool({
    name: 'get_phone_alerts',
    description: 'Fetch real-time cell phone usage alerts logged by YOLO vision service.',
    inputSchema: z.object({
      limit: z.number().optional().default(10).describe('Maximum number of alerts to retrieve'),
    }),
  })
  @Widget('phone-alerts')
  async getPhoneAlerts(input?: { limit?: number }, ctx?: ExecutionContext) {
    try {
      const response = await fetch(`${PYTHON_API_URL}/phone-alerts/recent`, {
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) {
        throw new Error(`Python API returned status ${response.status}`);
      }

      const alerts = await response.json();
      return {
        alerts: alerts.slice(0, input?.limit || 10),
        total: alerts.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        error: `Python API Unreachable: ${error.message}`,
        alerts: [],
        total: 0,
      };
    }
  }

  /**
   * 5. Generate Markdown Report (Live Data from DB)
   */
  @Tool({
    name: 'generate_report',
    description: 'Generate a formatted text report with real attendance totals, focus score, phone distraction alerts, and break time analytics from database.',
    inputSchema: z.object({
      title: z.string().optional().default('Work Sight AI Live Intelligence Report'),
    }),
  })
  async generateReport(input?: { title?: string }, ctx?: ExecutionContext) {
    try {
      const response = await fetch(`${PYTHON_API_URL}/attendance/summary`, {
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const reportMarkdown = `
📊 **${input?.title || 'Work Sight AI Live Report'}**
====================================
👥 Total Employees: ${data.total_students ?? 0}
✅ Present: ${data.present_count ?? 0}
🎯 Focus Score: ${data.focus_score ?? 0}%
📱 Cell Phone Alerts: ${data.phone_alerts_count ?? 0}
⏱️ Total Break Time: ${data.total_break_minutes ?? 0} mins
====================================
📅 Generated at: ${new Date().toLocaleString()}
`;
      return {
        content: [{ type: 'text', text: reportMarkdown }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `❌ Error fetching live report: ${error.message}` }],
        isError: true,
      };
    }
  }

  /**
   * 6. Record Attendance Check-In (Live DB Insert)
   */
  @Tool({
    name: 'record_attendance',
    description: 'Record a real attendance check-in event in the SQLite database.',
    inputSchema: z.object({
      student_id: z.number().describe('Student or Employee ID'),
      status: z.enum(['present', 'absent', 'late']).optional().default('present'),
    }),
  })
  async recordAttendance(input: { student_id: number; status?: string }, ctx?: ExecutionContext) {
    try {
      const response = await fetch(`${PYTHON_API_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: input.student_id, status: input.status || 'present' }),
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * 7. Trigger Phone Alert (Live DB Insert)
   */
  @Tool({
    name: 'trigger_phone_alert',
    description: 'Log a real cell phone detection alert event in the SQLite database.',
    inputSchema: z.object({}),
  })
  async triggerPhoneAlert(input?: any, ctx?: ExecutionContext) {
    try {
      const response = await fetch(`${PYTHON_API_URL}/phone-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * 8. Handle Break (Live DB Insert)
   */
  @Tool({
    name: 'handle_break',
    description: 'Start or end a real workplace break tracking session in SQLite database.',
    inputSchema: z.object({
      action: z.enum(['start', 'end']).describe('Action: start or end break'),
    }),
  })
  async handleBreak(input: { action: 'start' | 'end' }, ctx?: ExecutionContext) {
    try {
      const response = await fetch(`${PYTHON_API_URL}/break`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: input.action }),
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
