/**
 * HealthPass Lite Resources
 * 
 * Declarative resources for patient data:
 * - patient://{patientId}/profile — Patient profile information
 */

import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { MOCK_PATIENTS } from '../../fixtures/patients.js';

export class HealthPassResources {
  /**
   * Patient profile resource
   * URI: patient://{patientId}/profile
   */
  @Resource({
    uri: 'patient://{patientId}/profile',
    name: 'Patient Profile',
    description: 'Patient profile information including name, age, blood group, and allergies',
    mimeType: 'application/json'
  })
  async getPatientProfile(
    uri: string,
    ctx: ExecutionContext
  ): Promise<{
    contents: Array<{
      uri: string;
      mimeType: string;
      text: string;
    }>;
  }> {
    // Extract patientId from URI (format: patient://{patientId}/profile)
    const match = uri.match(/^patient:\/\/([^/]+)\/profile$/);
    if (!match) {
      ctx.logger.warn(`Invalid patient profile URI: ${uri}`);
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'Invalid URI format' })
        }]
      };
    }

    const patientId = match[1];
    const patient = MOCK_PATIENTS[patientId];

    if (!patient) {
      ctx.logger.warn(`Patient not found: ${patientId}`);
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ error: `Patient ${patientId} not found` })
        }]
      };
    }

    ctx.logger.info(`Retrieved patient profile: ${patient.name} (${patientId})`);

    const profileData = {
      id: patient.id,
      name: patient.name,
      age: patient.age,
      bloodGroup: patient.bloodGroup,
      allergies: patient.allergies,
      email: patient.email
    };

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(profileData, null, 2)
      }]
    };
  }
}
