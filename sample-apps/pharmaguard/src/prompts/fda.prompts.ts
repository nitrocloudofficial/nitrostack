import { ControllerDecorator as Controller, PromptDecorator as Prompt, type ExecutionContext } from '@nitrostack/core';

@Controller()
export class FdaPrompts {
  @Prompt({
    name: 'drug_safety_audit',
    description: 'Perform a comprehensive drug safety audit.',
    arguments: [
      {
        name: 'drugName',
        description: 'Name of the drug to audit (generic or brand)',
        required: true,
      },
    ],
  })
  async drugSafetyAudit(
    args: { drugName: string },
    context: ExecutionContext,
  ) {
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please perform a comprehensive drug safety audit for the drug: ${args.drugName}. Include any known adverse reactions, recent recalls, and a general risk assessment based on FDA data.`,
        },
      },
    ];
  }

  @Prompt({
    name: 'recall_risk_assessment',
    description: 'Analyze the risk profile based on recall history.',
    arguments: [
      {
        name: 'drugName',
        description: 'Name of the drug to assess for recall risks',
        required: true,
      },
    ],
  })
  async recallRiskAssessment(
    args: { drugName: string },
    context: ExecutionContext,
  ) {
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Provide a detailed risk assessment for ${args.drugName} focusing specifically on its FDA recall history. Analyze any enforcement actions, classifications, and the reasons for recalls.`,
        },
      },
    ];
  }
}
