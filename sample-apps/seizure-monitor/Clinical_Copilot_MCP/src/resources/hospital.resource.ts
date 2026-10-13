import { Injectable, ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

/**
 * Clinical Copilot MCP Server - Hospital Resources
 *
 * Exposes medical center directory, specialty center capabilities, and hospital contact information.
 */
@Injectable()
export class HospitalResources {
  @Resource({
    uri: 'clinical://hospital/{id}',
    name: 'Hospital & Specialty Directory',
    description: 'Exposes healthcare institution directory, trauma level ratings, and specialty departments.',
    mimeType: 'application/json',
  })
  async getHospitalDirectory(ctx: ExecutionContext) {
    return {
      hospitalId: 'hosp_001',
      name: 'Metropolitan Tertiary Medical Center',
      traumaLevel: 'Level I',
      departments: ['Cardiology', 'Oncology', 'Neurology', 'Emergency', 'Pediatrics'],
      address: '100 Healthcare Boulevard, Suite 500',
      contactEmail: 'referrals@metropolitanhealth.org',
    };
  }
}
