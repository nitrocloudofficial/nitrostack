import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class SafetyResources {
  @Resource({
    uri: 'factoryos://safety/compliance-log',
    name: 'Safety & Compliance Log',
    description: 'Plant safety audit metrics, incident logs, and OSHA compliance ratings',
    mimeType: 'application/json'
  })
  async getSafetyLog(_ctx: ExecutionContext) {
    return {
      daysWithoutIncident: 142,
      openSafetyTickets: 1,
      lastAuditScore: '98/100',
      complianceStatus: 'OSHA_COMPLIANT'
    };
  }
}
