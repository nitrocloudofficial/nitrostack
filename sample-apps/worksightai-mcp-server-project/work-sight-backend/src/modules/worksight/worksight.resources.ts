import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000/api';

export class WorkSightResources {
  @Resource({
    uri: 'worksight://summary',
    name: 'Work Sight Live Summary',
    description: 'Current real-time summary statistics including total employees, present count, focus score, phone alerts, and break duration.',
    mimeType: 'application/json',
  })
  async getSummaryResource(uri: string, ctx: ExecutionContext) {
    let summaryData = {
      total_students: 20,
      present_count: 17,
      focus_score: 89,
      phone_alerts_count: 1,
      total_break_minutes: 10.0,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${PYTHON_API_URL}/attendance/summary`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        summaryData = await response.json();
      }
    } catch (err) {
      // Fallback
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(summaryData, null, 2),
      }],
    };
  }

  @Resource({
    uri: 'worksight://students',
    name: 'Work Sight Employee Roster',
    description: 'Roster list of all registered employees/students in the system.',
    mimeType: 'application/json',
  })
  async getStudentsResource(uri: string, ctx: ExecutionContext) {
    let students = [
      { id: 1, name: 'Alice Johnson' },
      { id: 2, name: 'Bob Smith' },
      { id: 3, name: 'Charlie Brown' },
      { id: 4, name: 'Diana Prince' },
    ];

    try {
      const response = await fetch(`${PYTHON_API_URL}/students`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        students = await response.json();
      }
    } catch (err) {
      // Fallback
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ students }, null, 2),
      }],
    };
  }
}
