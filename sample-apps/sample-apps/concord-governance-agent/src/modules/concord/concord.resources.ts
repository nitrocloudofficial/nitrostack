import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { getDevops, getSecops, getFinops, getIam, getState } from '../../state/state.js';

export class ConcordResources {
  @Resource({
    uri: 'devops://kubernetes/live-clusters.json',
    name: 'Live Kubernetes Clusters',
    description: 'Real-time status of all production Kubernetes clusters including deployment queues and active services.',
    mimeType: 'application/json'
  })
  async getLiveClusters(ctx: ExecutionContext) {
    const data = getDevops();
    return {
      contents: [{
        uri: 'devops://kubernetes/live-clusters.json',
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'secops://network/threat-intel.json',
    name: 'Network Threat Intelligence',
    description: 'Active threat signals, severity levels, and affected nodes from the security operations center.',
    mimeType: 'application/json'
  })
  async getThreatIntel(ctx: ExecutionContext) {
    const data = getSecops();
    return {
      contents: [{
        uri: 'secops://network/threat-intel.json',
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'finops://erp/department-ledgers.json',
    name: 'Department Financial Ledgers',
    description: 'Budget allocations, burn rates, reserve floors, and active customer contracts across all departments.',
    mimeType: 'application/json'
  })
  async getDepartmentLedgers(ctx: ExecutionContext) {
    const data = getFinops();
    return {
      contents: [{
        uri: 'finops://erp/department-ledgers.json',
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'iam://directory/active-session.json',
    name: 'Active IAM Session',
    description: 'Currently authenticated user role and identity for authorization checks.',
    mimeType: 'application/json'
  })
  async getActiveSession(ctx: ExecutionContext) {
    const data = getIam();
    return {
      contents: [{
        uri: 'iam://directory/active-session.json',
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'weather://live-risk.json',
    name: 'Weather Risk Signal',
    description: 'Live weather risk signal for the Chennai data centre region. Elevated risk (thunderstorm / high wind) affects operational decisions for PROD-01.',
    mimeType: 'application/json'
  })
  async getWeatherRisk(ctx: ExecutionContext) {
    const data = getState().weather;
    return {
      contents: [{
        uri: 'weather://live-risk.json',
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2)
      }]
    };
  }
}
