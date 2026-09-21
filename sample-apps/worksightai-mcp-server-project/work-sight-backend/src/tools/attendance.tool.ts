import { ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';

export class AttendanceTools {
  @Tool({
    name: 'getAttendance',
    description: 'Get live attendance summary from the Python API (total employees, present, focus score, etc.)',
    inputSchema: z.object({}), // No input parameters needed
  })
  async getAttendance() {
    try {
      const response = await fetch('http://localhost:5000/api/attendance/summary', {
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Return in NitroStack's expected format
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Error fetching attendance: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
}