import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class SupervisorResources {
  @Resource({
    uri: 'factoryos://supervisor/agent-directory',
    name: 'Agent Directory',
    description: 'List of registered AI specialist agents and their capabilities in FactoryOS',
    mimeType: 'application/json'
  })
  async getAgentDirectory(_ctx: ExecutionContext) {
    return {
      agents: [
        { name: 'Supervisor Agent', role: 'Orchestration and request delegation' },
        { name: 'Maintenance Agent', role: 'Machine diagnostics, health, technician assignment, business impact' },
        { name: 'Inventory Agent', role: 'Stock management, shortage detection, replenishment recommendations' },
        { name: 'Procurement Agent', role: 'Supplier discovery, automated negotiation, purchase order generation' },
        { name: 'Production Agent', role: 'Schedule optimization, line rerouting during downtime' },
        { name: 'Safety Agent', role: 'Incident reporting and compliance hazard assessment' }
      ]
    };
  }
}
