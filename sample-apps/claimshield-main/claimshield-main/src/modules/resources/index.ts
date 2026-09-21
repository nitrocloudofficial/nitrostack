import { Module, ResourceDecorator as Resource, Injectable } from '@nitrostack/core';
import { INCIDENTS_DB } from '../incidents/index.js';
import { ACTIONS_DB } from '../actions/index.js';
import { runDenialRiskEngine } from '../../engine/denial-rules.engine.js';
import { determineDocuments } from '../documents/index.js';

@Injectable()
export class ResourcesController {
  @Resource({
    uri: 'claimshield://policies/demo-guide',
    name: 'Policy Fixture Explanation',
    description: 'Explains the available demo policies and their required documents.'
  })
  getPolicyGuide() {
    return {
      text: `DEMO POLICIES GUIDE (Not real insurance advice):
1. Motor Basic: Requires policy number, vehicle registration, driving licence, incident photos, FIR (if injury/major damage).
2. Motor Premium: Requires all Motor Basic docs + repair estimate.
3. Health Add-on: Requires policy number, identity proof, hospital bill/estimate (if hospital visit), discharge summary (if admitted).

Denial Rules Engine Deadlines and Triggers:
- Motor Basic: 7-day filing deadline, FIR mandatory for injuries, licence required
- Motor Premium: same as basic but surveyor mandatory above Rs 75,000
- Health Addon: 15-day deadline, pre-auth required for cashless, 30-day for third-party claims`
    };
  }

  @Resource({
    uri: 'claimshield://incidents/{incidentId}/summary',
    name: 'Incident Summary',
    description: 'JSON summary of current incident, documents, score, and action plan.'
  })
  getIncidentSummary(params: { incidentId: string }) {
    const incident = INCIDENTS_DB.get(params.incidentId);
    if (!incident) throw new Error("Incident not found");

    const docs = determineDocuments(incident);
    const readiness = runDenialRiskEngine(incident);
    const actions = ACTIONS_DB.get(params.incidentId) || [];

    return {
      json: JSON.stringify({
        incident,
        documents: docs,
        readiness,
        actions,
        disclaimer: "Demo guidance only."
      }, null, 2)
    };
  }

  @Resource({
    uri: 'claimshield://demo/scenarios',
    name: 'Demo Scenarios',
    description: 'Three ready-to-use demo cases.'
  })
  getDemoScenarios() {
    return {
      json: JSON.stringify([
        {
          id: 'demo-1',
          name: 'Mostly complete motor claim',
          accidentType: 'motor',
          incidentDate: new Date().toISOString(),
          location: 'Main St',
          policyType: 'motor-basic',
          policyNumber: 'POL-123',
          vehicleRegistration: 'TN-38-1234',
          drivingLicenceAvailable: true,
          injuryReported: false,
          firAvailable: false,
          hospitalBillAvailable: false,
          hospitalEstimateAvailable: false
        },
        {
          id: 'demo-2',
          name: 'Injury claim with missing FIR',
          accidentType: 'injury',
          incidentDate: new Date().toISOString(),
          location: 'Highway 42',
          policyType: 'health-addon',
          policyNumber: 'HLT-999',
          drivingLicenceAvailable: false,
          injuryReported: true,
          firAvailable: false,
          hospitalBillAvailable: false,
          hospitalEstimateAvailable: false
        },
        {
          id: 'demo-3',
          name: 'Old incident missing licence',
          accidentType: 'motor',
          incidentDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
          location: 'Park Ave',
          policyType: 'motor-premium',
          policyNumber: 'PREM-001',
          vehicleRegistration: 'TN-38-9999',
          drivingLicenceAvailable: false,
          injuryReported: false,
          firAvailable: false,
          hospitalBillAvailable: false,
          hospitalEstimateAvailable: false
        },
        {
          id: 'demo-4',
          name: 'High value motor claim missing surveyor',
          accidentType: 'motor',
          claimType: 'motor',
          incidentDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          location: 'Chennai bypass',
          policyType: 'motor-premium',
          policyNumber: 'PREM-002',
          drivingLicenceAvailable: true,
          hasDrivingLicence: true,
          injuryReported: false,
          hasInjuries: false,
          firAvailable: false,
          hasFIR: false,
          hospitalBillAvailable: false,
          hospitalEstimateAvailable: false,
          estimatedDamage: 120000,
          hasSurveyor: false,
          state: 'TamilNadu'
        }
      ], null, 2)
    };
  }
}

@Module({
  name: 'ResourcesModule',
  controllers: [ResourcesController]
})
export class ResourcesModule {}
