import { CalendarWorkflowService } from '../workflows/CalendarWorkflow.service.js';

export async function fetchCalendarEvents() {
  const service = new CalendarWorkflowService();
  return service.getTodayEvents();
}
