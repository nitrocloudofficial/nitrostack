import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

export class DoctorDiscoveryTool {
  @Tool({
    name: 'find_doctors_with_slots',
    description: 'Find available doctors and appointment slots matching a medical specialty from relational database',
    inputSchema: z.object({
      recommendedSpecialty: z.string().describe('Target medical specialty to query')
    })
  })
  async findDoctorsWithSlots(input: { recommendedSpecialty: string }, ctx: ExecutionContext) {
    ctx.logger.info('Querying doctors by specialty', { specialty: input.recommendedSpecialty });

    const mockDoctors = [
      {
        id: 101,
        name: 'Dr. Sarah Jenkins, MD',
        specialty: input.recommendedSpecialty,
        clinicName: 'Metropolitan Health Center',
        rating: 4.9,
        availableSlots: ['2026-08-01T09:00:00Z', '2026-08-01T11:30:00Z', '2026-08-01T14:00:00Z']
      },
      {
        id: 102,
        name: 'Dr. Robert Chen, DO',
        specialty: input.recommendedSpecialty,
        clinicName: 'Apex Specialist Clinic',
        rating: 4.8,
        availableSlots: ['2026-08-02T10:00:00Z', '2026-08-02T15:30:00Z']
      },
      {
        id: 103,
        name: 'Dr. Elena Rostova, MD',
        specialty: input.recommendedSpecialty,
        clinicName: 'St. Jude Community Care',
        rating: 4.95,
        availableSlots: ['2026-08-01T13:00:00Z', '2026-08-03T08:30:00Z']
      }
    ];

    return {
      status: 'success',
      specialty: input.recommendedSpecialty,
      count: mockDoctors.length,
      doctors: mockDoctors
    };
  }
}
