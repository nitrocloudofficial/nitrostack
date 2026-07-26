import { ActionHistoryResource } from './action-history.js';
import { NetworkTopologyResource } from './network-topology.js';
import { SIEMLogsResource } from './siem-logs.js';
import { ThreatIntelResource } from './threat-intel.js';
export { ActionHistoryResource, NetworkTopologyResource, SIEMLogsResource, ThreatIntelResource };
export declare const actionHistoryResource: ActionHistoryResource;
export declare const networkTopologyResource: NetworkTopologyResource;
export declare const siemLogsResource: SIEMLogsResource;
export declare const threatIntelResource: ThreatIntelResource;
/**
 * Loads the mock-data JSON fixtures into the in-memory resource singletons.
 * Safe to call multiple times; only loads once.
 */
export declare function ensureMockDataLoaded(): Promise<void>;
//# sourceMappingURL=index.d.ts.map