/**
 * HealthBridge Resources Controller
 * ==================================
 * Exposes cross-hospital patient data as MCP resources.
 *
 * Resources:
 *   healthbridge://patients/all          → full patient list
 *   healthbridge://patients/{patientId}  → single patient timeline
 *
 * Note: The parameterised URI uses ResourceTemplate (createResourceTemplate)
 * registered in the module, while the static URI uses @Resource decorator.
 */

import { ResourceDecorator as Resource, ControllerDecorator as Controller, Injectable, type ExecutionContext } from '@nitrostack/core';
import { HealthBridgeService } from './healthbridge.service';

@Controller()
@Injectable({ deps: [HealthBridgeService] })
export class HealthBridgeResources {
  constructor(private readonly svc: HealthBridgeService) {}

  @Resource({
    uri: 'healthbridge://patients/all',
    name: 'All Patients (Summaries)',
    description:
      'Lightweight summary list of all patients across all hospitals — includes patientId, name, DOB, known allergies, and visit count. Use healthbridge://patients/{patientId} to fetch the full timeline for a specific patient.',
    mimeType: 'application/json',
  })
  async getAllPatients(_ctx: ExecutionContext) {
    const summaries = this.svc.getPatientSummaries();
    return JSON.stringify(summaries, null, 2);
  }

  @Resource({
    uri: 'healthbridge://patients/count',
    name: 'Patient Count',
    description: 'Returns the total number of patients registered across all hospitals.',
    mimeType: 'application/json',
  })
  async getPatientCount(_ctx: ExecutionContext) {
    return JSON.stringify({ totalPatients: this.svc.getPatientCount() });
  }
}
