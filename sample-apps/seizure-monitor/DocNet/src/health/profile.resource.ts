import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class HealthProfileResources {
  @Resource({
    uri: 'health://profile/static',
    name: 'User Static Profile',
    description: 'Tier 1 static memory profile data (age, allergies, chronic conditions)',
    mimeType: 'application/json'
  })
  async getStaticProfile(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching Tier 1 static profile context');

    const profile = {
      patientId: 'patient-demo-01',
      full_name: 'John Doe',
      age: 42,
      knownAllergies: ['Penicillin', 'Peanuts'],
      chronicConditions: ['Mild Asthma', 'Hypertension'],
      bloodType: 'O+'
    };

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(profile, null, 2)
      }]
    };
  }
}
