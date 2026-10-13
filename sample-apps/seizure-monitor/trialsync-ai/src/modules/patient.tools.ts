import { Module, ToolDecorator as Tool, z } from '@nitrostack/core';

@Module({
  name: 'PatientModule',
})
export class PatientTools {
  @Tool({
    name: 'get_patient_details',
    description: 'Retrieves patient demographic and clinical data',
    inputSchema: z.object({
      patientId: z.string().describe('Unique ID of the patient'),
    }),
  })
  async getPatientDetails(input: { patientId: string }) {
    return {
      patientId: input.patientId,
      name: 'John Doe',
      age: 45,
      condition: 'Breast Cancer',
      status: 'Active',
    };
  }
}