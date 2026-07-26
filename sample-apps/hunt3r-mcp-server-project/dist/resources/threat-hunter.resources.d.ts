import { ExecutionContext } from '@nitrostack/core';
export declare class ThreatHunterResources {
    getNetworkTopology(uri: string, ctx: ExecutionContext): Promise<{
        contents: {
            uri: string;
            mimeType: string;
            text: string;
        }[];
    }>;
    getRecentSiemLogs(uri: string, ctx: ExecutionContext): Promise<{
        contents: {
            uri: string;
            mimeType: string;
            text: string;
        }[];
    }>;
    getThreatIntelProfiles(uri: string, ctx: ExecutionContext): Promise<{
        contents: {
            uri: string;
            mimeType: string;
            text: string;
        }[];
    }>;
    getActionHistory(uri: string, ctx: ExecutionContext): Promise<{
        contents: {
            uri: string;
            mimeType: string;
            text: string;
        }[];
    }>;
}
//# sourceMappingURL=threat-hunter.resources.d.ts.map