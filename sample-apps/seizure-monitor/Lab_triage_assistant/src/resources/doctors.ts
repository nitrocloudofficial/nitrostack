/**
 * Mock Doctor Registry
 *
 * In-memory specialist roster used by assign_appointment to pick a doctor
 * by specialty without relying on any external system.
 */

import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export interface DoctorRecord {
  doctorId: string;
  doctorName: string;
  specialist: string;
}

export const doctorsBySpecialty: Record<string, DoctorRecord[]> = {
  Endocrinologist: [
    { doctorId: 'doc_endo_1', doctorName: 'Dr. Sharma', specialist: 'Endocrinologist' },
    { doctorId: 'doc_endo_2', doctorName: 'Dr. Iyer', specialist: 'Endocrinologist' }
  ],
  Nephrologist: [
    { doctorId: 'doc_neph_1', doctorName: 'Dr. Patel', specialist: 'Nephrologist' },
    { doctorId: 'doc_neph_2', doctorName: 'Dr. Rao', specialist: 'Nephrologist' }
  ],
  Cardiologist: [
    { doctorId: 'doc_card_1', doctorName: 'Dr. Mehta', specialist: 'Cardiologist' }
  ],
  Hematologist: [
    { doctorId: 'doc_hema_1', doctorName: 'Dr. Verma', specialist: 'Hematologist' }
  ],
  Hepatologist: [
    { doctorId: 'doc_hepa_1', doctorName: 'Dr. Singh', specialist: 'Hepatologist' }
  ]
};

export function getDoctorsForSpecialty(specialist: string): DoctorRecord[] {
  return doctorsBySpecialty[specialist] ?? [];
}

export function getDoctorById(doctorId: string): DoctorRecord | undefined {
  for (const doctors of Object.values(doctorsBySpecialty)) {
    const match = doctors.find((doctor) => doctor.doctorId === doctorId);
    if (match) return match;
  }

  return undefined;
}

export class DoctorsResources {
  @Resource({
    uri: 'labs://doctors',
    name: 'Mock Doctor Registry',
    description: 'Mock in-memory doctor registry grouped by specialty for appointment assignment demos.',
    mimeType: 'application/json',
    examples: {
      response: JSON.parse(JSON.stringify({ doctorsBySpecialty }))
    }
  })
  async getDoctors(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching mock doctor registry');

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ doctorsBySpecialty }, null, 2)
      }]
    };
  }
}