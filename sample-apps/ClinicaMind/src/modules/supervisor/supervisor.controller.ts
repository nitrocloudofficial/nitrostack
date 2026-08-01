import { ControllerDecorator as Controller, ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { SupervisorService } from './supervisor.service.js';

const OrchestrateConsultationSchema = z.object({
  transcript: z.string().describe('Live doctor-patient consultation transcript'),
  patientId: z.string().optional().default('1234').describe('Target EMR patient ID')
});

@Controller('supervisor')
@Injectable({ deps: [SupervisorService] })
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  @Tool({
    name: 'orchestrate_clinical_briefing',
    description: 'Main entry point for multi-agent clinical decision support graph. Parses transcript, triggers specialized agents, and compiles live clinical briefing.',
    inputSchema: OrchestrateConsultationSchema,
    examples: {
      request: { transcript: 'Patient presents with 3 days of high fever, productive cough, and right-sided pleuritic chest pain.', patientId: '1234' },
      response: {
        agent: 'Supervisor Agent',
        status: 'completed'
      }
    }
  })
  async orchestrateClinicalBriefing(args: z.infer<typeof OrchestrateConsultationSchema>, ctx: ExecutionContext) {
    ctx.logger.info(`🤖 [Supervisor Agent] Initiating multi-agent consultation briefing for patient ${args.patientId}...`);
    const result = await this.supervisorService.orchestrateConsultation(args.transcript, args.patientId);
    return {
      status: 'success',
      agent: 'Supervisor Agent',
      result
    };
  }
}
