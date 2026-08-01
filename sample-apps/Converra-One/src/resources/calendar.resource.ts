import { CalendarWorkflowService } from '../workflows/CalendarWorkflow.service.js';

export const calendarResource = {
  uri: 'resource://calendar/today',
  name: "Today's Calendar Schedule",
  description: 'Upcoming meetings, schedule timeline, and event reminders',
  read: async () => {
    const service = new CalendarWorkflowService();
    return service.getTodayEvents();
  }
};
