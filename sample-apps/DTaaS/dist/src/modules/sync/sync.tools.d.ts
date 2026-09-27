import { ExecutionContext } from "@nitrostack/core";
export declare class SyncTools {
    private readonly registryService;
    private readonly syncService;
    registerDevice(input: {
        deviceId: string;
        syncIntervalSeconds?: number;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        device: {
            deviceId: string;
            enabled: boolean;
            syncIntervalSeconds: number;
            lastSyncedTimestamp: number | null;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
        device?: undefined;
    }>;
    unregisterDevice(input: {
        deviceId: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
    }>;
    pauseDevice(input: {
        deviceId: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        device: {
            deviceId: string;
            enabled: boolean;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
        device?: undefined;
    }>;
    resumeDevice(input: {
        deviceId: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        device: {
            deviceId: string;
            enabled: boolean;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
        device?: undefined;
    }>;
    getDeviceSyncStatus(input: {
        deviceId: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        status: {
            enabled: boolean;
            lastSyncedTimestamp: number | null;
            lastSyncStatus: string | null;
            lastSyncError: string | null;
            syncIntervalSeconds: number;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        status?: undefined;
    }>;
    syncDeviceNow(input: {
        deviceId: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        rowCount: number;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
        rowCount?: undefined;
    }>;
    backfillDeviceHistory(input: {
        deviceId: string;
        keys: string[];
        startTs: number;
        endTs: number;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        rowCount: number;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
        rowCount?: undefined;
    }>;
}
//# sourceMappingURL=sync.tools.d.ts.map