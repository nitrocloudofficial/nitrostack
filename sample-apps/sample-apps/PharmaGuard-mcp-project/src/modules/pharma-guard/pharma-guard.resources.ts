import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load patients from the JSON file
 */
function loadPatients() {
  const dataPath = path.join(__dirname, 'data', 'patients.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw).patients;
}

export class PharmaGuardResources {
  /**
   * Resource: List all patients
   * URI: pharma://patients
   */
  @Resource({
    uri: 'pharma://patients',
    name: 'Patient Registry',
    description: 'List of all patients in the mock EHR system with full clinical profiles',
    mimeType: 'application/json',
    examples: {
      response: {
        patients: [
          { id: 'P001', name: 'Mr. Sharma', age: 65 },
          { id: 'P002', name: 'Ms. Fernandez', age: 29 },
          { id: 'P003', name: 'Mr. Rao', age: 80 }
        ]
      }
    }
  })
  async getAllPatients(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching all patient profiles');

    const patients = loadPatients();

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ patients }, null, 2)
      }]
    };
  }

  /**
   * Resource: Get a single patient by ID
   * URI Template: pharma://patients/{patientId}
   */
  @Resource({
    uri: 'pharma://patients/{patientId}',
    name: 'Patient Profile',
    description: 'Full clinical profile for a specific patient — demographics, labs, allergies, diagnoses, current medications',
    mimeType: 'application/json',
    examples: {
      response: {
        id: 'P001',
        name: 'Mr. Sharma',
        age: 65,
        weightKg: 78,
        sex: 'male',
        diagnoses: ['Hypertension', 'Sinusitis'],
        allergies: ['Penicillin'],
        currentMedications: [{ name: 'Lisinopril', dosage: '10mg', frequency: 'daily' }]
      }
    }
  })
  async getPatientById(uri: string, ctx: ExecutionContext) {
    // Extract patientId from URI like "pharma://patients/P001"
    const patientId = uri.split('/').pop();
    ctx.logger.info('Fetching patient profile', { patientId });

    const patients = loadPatients();
    const patient = patients.find((p: any) => p.id === patientId);

    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
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
