import { Module, ToolDecorator as Tool, z } from '@nitrostack/core';

@Module({
  name: 'JourneyModule',
})
export class JourneyTools {
  @Tool({
    name: 'get_patient_journey',
    description: 'Tracks timeline milestones of patient trial participation',
    inputSchema: z.object({
      patientId: z.string(),
    }),
  })
  async getJourney(input: { patientId: string }) {
    return {
      timeline: [
        { phase: 'Screening', status: 'Completed', date: '2026-06-01' },
        { phase: 'Enrollment', status: 'In Progress', date: '2026-07-01' },
      ],
    };
  }
}