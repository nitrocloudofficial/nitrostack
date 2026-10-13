import { Prompt } from '@nitrostack/core';

export const generateReportPrompt = new Prompt({
  name: 'generate_doctor_report',
  description: 'Generates a clinical summary report tailored for attending physicians.',
  arguments: [
    {
      name: 'patientId',
      description: 'The unique ID of the patient',
      required: true
    },
    {
      name: 'trialId',
      description: 'The clinical trial ID',
      required: true
    },
    {
      name: 'score',
      description: 'Calculated match score percentage',
      required: true
    }
  ],
  async getMessages(args: Record<string, any>) {
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are the Recommendation Agent for TrialSync AI.\nSummarize the match analysis for Patient ${args.patientId} and Trial ${args.trialId}.\nCalculated Score: ${args.score}%.\nExplain key inclusion reasons and flag any medication warnings for the attending doctor.`
        }
      }
    ];
  }
} as any);