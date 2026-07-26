import { ActionHistoryResource } from './action-history.js';
import { NetworkTopologyResource } from './network-topology.js';
import { SIEMLogsResource } from './siem-logs.js';
import { ThreatIntelResource } from './threat-intel.js';
export { ActionHistoryResource, NetworkTopologyResource, SIEMLogsResource, ThreatIntelResource };
export const actionHistoryResource = new ActionHistoryResource();
export const networkTopologyResource = new NetworkTopologyResource();
export const siemLogsResource = new SIEMLogsResource();
export const threatIntelResource = new ThreatIntelResource();
let mockDataLoaded = null;
/**
 * Loads the mock-data JSON fixtures into the in-memory resource singletons.
 * Safe to call multiple times; only loads once.
 */
export function ensureMockDataLoaded() {
    if (!mockDataLoaded) {
        mockDataLoaded = Promise.all([
            networkTopologyResource.loadFromMock(),
            siemLogsResource.loadFromMock(),
            threatIntelResource.loadFromMock(),
        ]).then(() => undefined);
    }
    return mockDataLoaded;
}
