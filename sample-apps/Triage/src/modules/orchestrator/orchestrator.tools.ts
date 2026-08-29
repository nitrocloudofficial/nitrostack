// src/modules/orchestrator/orchestrator.tools.ts
import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { TriageService } from '../triage/triage.service.js';
import { HospitalService } from '../hospital-finder/hospital.service.js';
import { NotificationService } from '../notification/notification.service.js';

const HandleEmergencySchema = z.object({
  patientName: z.string(),
  symptomText: z.string(),
  vitals: z.object({
    heartRate: z.number().optional(),
    spo2: z.number().optional(),
    systolicBP: z.number().optional(),
    temperatureC: z.number().optional()
  }).optional(),
  lat: z.number().describe('Patient current latitude'),
  lng: z.number().describe('Patient current longitude'),
  contactEmail: z.string().email().describe('Emergency contact email')
});

@Injectable()
export class OrchestratorTools {
  private triageService = new TriageService();
  private hospitalService = new HospitalService();
  private notificationService = new NotificationService();

  @Tool({
    name: 'handle_emergency',
    description: 'Full emergency pipeline in one call: analyzes symptoms + vitals, finds nearest hospital, and — if critical — sends an alert email to the emergency contact with condition, hospital, and location.',
    inputSchema: HandleEmergencySchema
  })
  async handleEmergency(args: z.infer<typeof HandleEmergencySchema>, ctx: ExecutionContext) {
    // 1. Triage
    const textResult = this.triageService.scoreSymptomText(args.symptomText);
    const vitalsResult = this.triageService.scoreVitals(args.vitals ?? {});
    const decision = this.triageService.decide(textResult, vitalsResult);

    // 2. Hospital-finder
    const hospitalResults = this.hospitalService.findNearest(args.lat, args.lng, true);
    const nearestHospital = hospitalResults[0] ?? null;

    // 3. Notification — only if escalated
    let alertResult: any = null;
    if (decision.escalate) {
      const message =
        `🚨 EMERGENCY ALERT\n` +
        `${args.patientName} needs urgent help.\n` +
        `Condition: ${decision.severity} — ${decision.reasons.join(', ')}\n` +
        (nearestHospital ? `Nearest hospital: ${nearestHospital.name}, ${nearestHospital.address}\n` : '') +
        `Location: https://maps.google.com/?q=${args.lat},${args.lng}\n` +
        `Please respond immediately.`;

      try {
        const result = await this.notificationService.sendAlert(
          args.contactEmail,
          `🚨 EMERGENCY ALERT — ${args.patientName}`,
          message
        );
        alertResult = { sent: true, ...result };
      } catch (err: any) {
        alertResult = { sent: false, error: err.message };
      }
    }

    ctx.logger.info('Emergency pipeline complete', {
      patient: args.patientName,
      severity: decision.severity,
      escalate: decision.escalate,
      hospitalFound: !!nearestHospital,
      alertSent: alertResult?.sent ?? false
    });

    return {
      triage: {
        severity: decision.severity,
        escalate: decision.escalate,
        reasons: decision.reasons
      },
      hospital: nearestHospital,
      alert: alertResult
    };
  }
}