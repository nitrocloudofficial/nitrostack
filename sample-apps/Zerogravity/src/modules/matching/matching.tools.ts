import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { MatchingService, RecommendedSpecialty, HospitalOption } from './matching.service.js';

@Injectable({ deps: [MatchingService] })
export class MatchingTools {
  constructor(private matchingService: MatchingService) {}

  @Tool({
    name: 'recommend-specialty',
    description:
      'Recommend a medical specialty based on candidate conditions from symptom analysis. Returns the top specialty match with confidence score and alternate options if ambiguous.',
    inputSchema: z.object({
      candidateConditions: z
        .array(z.string())
        .describe(
          'Array of medical conditions/symptoms to match against specialties'
        ),
    }),
    examples: {
      request: {
        candidateConditions: ['Acute Coronary Syndrome', 'Chest Pain'],
      },
      response: {
        specialty: {
          specialtyId: 'cardiology',
          specialtyName: 'Cardiology',
          confidenceScore: 1.0,
        },
        alternates: undefined,
      },
    },
  })
  async recommendSpecialty(
    input: { candidateConditions: string[] },
    ctx: ExecutionContext
  ) {
    try {
      const result = this.matchingService.recommendSpecialty(
        input.candidateConditions
      );
      return result;
    } catch (error) {
      throw new Error(
        `Failed to recommend specialty: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  @Tool({
    name: 'find-hospital-options',
    description:
      'Find available doctor/hospital options for a given specialty. Returns a ranked list with preferred hospital first if specified.',
    inputSchema: z.object({
      specialtyId: z.string().describe('The specialty ID to search for'),
      preferredHospitalId: z
        .string()
        .optional()
        .describe(
          'Optional hospital ID to prioritize. If no matching doctor exists, other options are returned with fallbackUsed flag.'
        ),
    }),
    examples: {
      request: {
        specialtyId: 'cardiology',
        preferredHospitalId: 'hospital-001',
      },
      response: {
        options: [
          {
            doctorId: 'doctor-001',
            doctorName: 'Dr. Sarah Mitchell',
            hospitalId: 'hospital-001',
            hospitalName: 'Metropolitan Medical Center',
            isPrimary: true,
          },
          {
            doctorId: 'doctor-006',
            doctorName: 'Dr. Robert Kim',
            hospitalId: 'hospital-002',
            hospitalName: "Children's Hospital Colorado",
            isPrimary: false,
          },
        ],
      },
    },
  })
  async findHospitalOptions(
    input: { specialtyId: string; preferredHospitalId?: string },
    ctx: ExecutionContext
  ) {
    try {
      const options = this.matchingService.findHospitalOptions(
        input.specialtyId,
        input.preferredHospitalId
      );
      return { options };
    } catch (error) {
      throw new Error(
        `Failed to find hospital options: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
