import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { loadJSON } from '../../shared/resource-loader.js';
import type { PatientDB } from '../../shared/shared.types.js';

// ---------------------------------------------------------------------------
// HealthResources — exposes patient profile data as MCP resources
// ---------------------------------------------------------------------------

export class HealthResources {

  @Resource({
    uri: 'health://patient-profiles',
    name: 'Family Patient Profiles',
    description: 'Complete health profiles for all family members including conditions, medications, genetic markers, allergies, and emergency contacts.',
    mimeType: 'application/json',
    examples: {
      response: {
        uri: 'health://patient-profiles',
        description: 'All family patient profiles'
      }
    }
  })
  async getAllPatientProfiles(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching all patient profiles resource');

    const db = loadJSON<PatientDB>('patient_profile.json', 'patient profiles');

    const summary = db.patients.map(p => ({
      patient_id: p.patient_id,
      name: p.name,
      relationship: p.relationship,
      age: p.age,
      blood_type: p.blood_type,
      conditions_count: p.conditions?.length || 0,
      medications_count: p.active_medications?.length || 0,
      genetic_markers: p.genetic_markers?.map(m => m.gene) || [],
      allergy_count: p.allergies?.length || 0
    }));

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          family_size: db.patients.length,
          summary,
          profiles: db.patients
        }, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'health://patient-profile/{patient_id}',
    name: 'Individual Patient Profile',
    description: 'Health profile for a single family member. Replace {patient_id} with P001 (Arthur), P002 (Mary), or P003 (Priya).',
    mimeType: 'application/json',
    examples: {
      response: {
        uri: 'health://patient-profile/P001',
        description: 'Arthur Krishnamurthy profile'
      }
    }
  })
  async getSinglePatientProfile(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching single patient profile resource', { uri });

    // Extract patient_id from the URI
    const uriMatch = uri.match(/health:\/\/patient-profile\/(.+)/);
    const patientId = uriMatch ? uriMatch[1] : null;

    const db = loadJSON<PatientDB>('patient_profile.json', 'patient profiles');

    if (!patientId) {
      // Return index of available patients
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            message: 'Specify a patient ID in the URI, e.g., health://patient-profile/P001',
            available_patients: db.patients.map(p => ({
              patient_id: p.patient_id,
              name: p.name,
              relationship: p.relationship
            }))
          }, null, 2)
        }]
      };
    }

    const patient = db.patients.find(p => p.patient_id === patientId);
    if (!patient) {
      throw new Error(`Patient "${patientId}" not found. Available: P001, P002, P003`);
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(patient, null, 2)
      }]
    };
  }
}
