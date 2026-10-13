import { ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';

export class ReportTools {
  @Tool({
    name: 'generateReport',
    description: 'Generate a formatted classroom report with attendance, focus, phone alerts, and break stats',
    inputSchema: z.object({}),
  })
  async generateReport() {
    try {
      const response = await fetch('http://localhost:5000/api/attendance/summary', {
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as {
        total_students?: number;
        present_count?: number;
        focus_score?: number;
        phone_alerts_count?: number;
        total_break_minutes?: number;
      };

      const report = `
📊 **Work Sight AI - Class Report**
====================================
👥 Total Employees: ${data.total_students || 0}
✅ Present: ${data.present_count || 0}
🎯 Focus Score: ${data.focus_score || 0}%
📱 Phone Alerts: ${data.phone_alerts_count || 0}
⏱️ Total Break Time: ${data.total_break_minutes || 0} minutes
====================================
📅 Generated at: ${new Date().toLocaleString()}
`;

      return {
        content: [
          {
            type: 'text',
            text: report,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
}