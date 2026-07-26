import { Module, ToolDecorator as Tool, z } from '@nitrostack/core';

@Module({
  name: 'SchedulerModule',
})
export class SchedulerTools {
  @Tool({
    name: 'schedule_visit',
    description: 'Schedules site visits and protocol procedures',
    inputSchema: z.object({
      patientId: z.string(),
      date: z.string(),
    }),
  })
  async scheduleVisit(input: { patientId: string; date: string }) {
    return {
      status: 'Confirmed',
      appointmentDate: input.date,
    };
  }
}