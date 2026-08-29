import { Injectable, ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { MedBridgeService, ConsentRequiredError } from './medbridge.service.js';

@Injectable({ deps: [MedBridgeService] })
export class MedBridgeResources {
  constructor(private medbridge: MedBridgeService) {}

  @Resource({
    uri: 'consent-log://{patientId}',
    name: 'Patient Consent / Access Log',
    description: 'Raw JSON audit trail for a given patient ID. Not consent-gated (auditing must always be possible).',
    mimeType: 'application/json',
  })
  async getConsentLogResource(uri: string, _ctx: ExecutionContext) {
    const patientId = uri.split('://')[1];
    const entries = this.medbridge.getConsentLog(patientId);
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(entries, null, 2),
        },
      ],
    };
  }

  @Resource({
    uri: 'patient-summary://{patientId}',
    name: 'Reconciled Patient Summary',
    description:
      'Raw JSON citation-backed reconciliation for a given patient ID. Requires an active consent grant ' +
      '(call the medbridge_request_consent tool first) — returns an error payload otherwise.',
    mimeType: 'application/json',
  })
  async getPatientSummaryResource(uri: string, ctx: ExecutionContext) {
    const patientId = uri.split('://')[1];
    const actor = ctx.auth?.subject ?? 'attending-physician';
    try {
      this.medbridge.requireConsent(patientId, 'patient-summary-resource', actor);
    } catch (err) {
      if (err instanceof ConsentRequiredError) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: err.message }, null, 2),
            },
          ],
        };
      }
      throw err;
    }
    this.medbridge.logAccess(patientId, 'patient-summary-resource', actor, 'Resource read');
    const result = this.medbridge.reconcilePatientHistory(patientId);
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
}