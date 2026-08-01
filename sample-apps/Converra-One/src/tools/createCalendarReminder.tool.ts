import { CalendarWorkflowService } from '../workflows/CalendarWorkflow.service.js';

export const createCalendarReminderTool = {
  name: 'createCalendarReminder',
  description: 'Creates a calendar reminder event after user confirmation',
  execute: async (input: { title: string; startTime: string }) => {
    const service = new CalendarWorkflowService();
    return service.createReminder(input.title, new Date(input.startTime));
  }
};
