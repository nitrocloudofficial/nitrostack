import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import {
  networkTopologyResource,
  siemLogsResource,
  threatIntelResource,
  actionHistoryResource,
} from './index.js';

export class ThreatHunterResources {
  @Resource({
    uri: 'hunt3r://network-topology',
    name: 'Network Topology',
    description: 'Current in-memory network topology graph (hosts, trust relationships, criticality).',
    mimeType: 'application/json',
  })
  async getNetworkTopology(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching network topology resource');
    const criticalAssets = await networkTopologyResource.getCriticalAssets();
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ critical_assets: criticalAssets }, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'hunt3r://siem-logs/recent',
    name: 'Recent SIEM Logs',
    description: 'Most recent SIEM events loaded into memory, sorted by timestamp.',
    mimeType: 'application/json',
  })
  async getRecentSiemLogs(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching recent SIEM logs resource');
    const recent = await siemLogsResource.query({});
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ logs: recent.slice(-100) }, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'hunt3r://threat-intel/apt-profiles',
    name: 'APT Threat Intel Profiles',
    description: 'Loaded APT actor profiles including TTPs and kill-chain phase timing.',
    mimeType: 'application/json',
  })
  async getThreatIntelProfiles(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching threat intel profiles resource');
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ note: 'Query via matchTechniquesToAPT/predictNextPhase tools for profile lookups.' }, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'hunt3r://action-history',
    name: 'Action History',
    description: 'Log of pre-emptive containment actions executed by HUNT3R-T.',
    mimeType: 'application/json',
  })
  async getActionHistory(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching action history resource');
    const actions = await actionHistoryResource.getAllActions();
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ actions }, null, 2)
      }]
    };
  }
}
