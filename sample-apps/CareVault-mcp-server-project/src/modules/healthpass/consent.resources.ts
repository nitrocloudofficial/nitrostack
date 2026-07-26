import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { getPatientConsents } from '../../fixtures/consents.js';
import { MOCK_PATIENTS } from '../../fixtures/patients.js';

/**
 * Consent audit resource
 * Allows patients to review which hospitals have access to their records
 * URI: access://{patientId}/consents
 */

export class ConsentResources {
  @Resource({
    uri: 'access://{patientId}/consents',
    name: 'Patient Consents',
    description: 'List hospitals that have access to a patient\'s medical records',
    mimeType: 'application/json',
  })
  async getPatientConsents(uri: string, ctx: ExecutionContext) {
    // Extract patientId from URI (format: access://{patientId}/consents)
    const match = uri.match(/^access:\/\/([^/]+)\/consents$/);
    if (!match) {
      ctx.logger.warn(`Invalid consent resource URI: ${uri}`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'Invalid URI format' }),
          },
        ],
      };
    }

    const patientId = match[1];

    // Validate patient exists
    if (!MOCK_PATIENTS[patientId]) {
      ctx.logger.warn(`Patient not found: ${patientId}`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: `Patient ${patientId} not found` }),
          },
        ],
      };
    }

    // Get all consents for this patient
    const consents = getPatientConsents(patientId);

    ctx.logger.info(`Consent audit retrieved for patient ${patientId}: ${consents.length} records`);

    const consentData = {
      patientId,
      consents: consents.map((record) => ({
        hospitalId: record.hospitalId,
        grantedAt: record.grantedAt,
        revokedAt: record.revokedAt || null,
        status: record.revokedAt ? 'revoked' : 'active',
      })),
      summary: {
        totalGranted: consents.length,
        activeConsents: consents.filter((c) => !c.revokedAt).length,
        revokedConsents: consents.filter((c) => c.revokedAt).length,
      },
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(consentData, null, 2),
        },
      ],
    };
  }
}
