import { ExecutionContext } from "@nitrostack/core";
export declare class ThingsBoardTools {
    createDevice(input: {
        deviceName: string;
        deviceType: string;
        label?: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        device: any;
    } | {
        success: boolean;
        message: any;
        device?: undefined;
    }>;
    saveAlarm(input: {
        originatorId: string;
        originatorType: string;
        type: string;
        severity: string;
        propagate?: boolean;
        details?: Record<string, any>;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        alarm: any;
    } | {
        success: boolean;
        message: any;
        alarm?: undefined;
    }>;
    deleteAlarm(input: {
        alarmId: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        result: any;
    } | {
        success: boolean;
        message: any;
        result?: undefined;
    }>;
    ackAlarm(input: {
        alarmId: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        result: any;
    } | {
        success: boolean;
        message: any;
        result?: undefined;
    }>;
    clearAlarm(input: {
        alarmId: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        result: any;
    } | {
        success: boolean;
        message: any;
        result?: undefined;
    }>;
    getAlarmInfoById(input: {
        alarmId: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        alarm: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        alarm?: undefined;
    }>;
    getAlarms(input: {
        entityType: string;
        entityId: string;
        pageSize: number;
        page: number;
        searchStatus?: string;
        status?: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        alarms: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        alarms?: undefined;
    }>;
    getAllAlarms(input: {
        pageSize: number;
        page: number;
        searchStatus?: string;
        status?: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        alarms: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        alarms?: undefined;
    }>;
    getHighestAlarmSeverity(input: {
        entityType: string;
        entityId: string;
        searchStatus?: string;
        status?: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        severity: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        severity?: undefined;
    }>;
    getAlarmTypes(input: {
        pageSize: number;
        page: number;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        types: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        types?: undefined;
    }>;
    getDeviceProfile(input: {
        profileId: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        profile: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        profile?: undefined;
    }>;
    addAlarmRuleToProfile(input: {
        profileId: string;
        alarmType: string;
        severity: string;
        conditionKey: string;
        conditionValueType: string;
        conditionOperation: string;
        conditionThreshold: any;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        rule: any;
    } | {
        success: boolean;
        message: any;
        rule?: undefined;
    }>;
    createUser(input: {
        email: string;
        authority: string;
        firstName?: string;
        lastName?: string;
        customerId?: string;
        homeDashboardId?: string;
        sendActivationMail: boolean;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        user: any;
        activationLink: any;
    } | {
        success: boolean;
        message: any;
        user?: undefined;
        activationLink?: undefined;
    }>;
    getUser(input: {
        userId: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        user: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        user?: undefined;
    }>;
    deleteUser(input: {
        userId: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        result: any;
    } | {
        success: boolean;
        message: any;
        result?: undefined;
    }>;
    getTenantUsers(input: {
        pageSize: number;
        page: number;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        users: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        users?: undefined;
    }>;
    createEmulator(input: {
        deviceName: string;
        emulatorType?: string;
        scenario?: string;
        telemetryRateSeconds?: number;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        emulator: {
            device: any;
            emulatorType: string;
            scenario: string;
            telemetryRateSeconds: number;
            status: string;
        };
    } | {
        success: boolean;
        message: any;
        emulator?: undefined;
    }>;
    createAsset(input: {
        assetName: string;
        assetType: string;
        label?: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        asset: any;
    } | {
        success: boolean;
        message: any;
        asset?: undefined;
    }>;
    deleteAsset(input: {
        assetName: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        result: {
            deletedAssetId: any;
            status: number;
        };
    } | {
        success: boolean;
        message: any;
        result?: undefined;
    }>;
    deleteDevice(input: {
        deviceName: string;
    }, ctx: ExecutionContext): Promise<{
        status: string;
        message: any;
    }>;
    createCustomer(input: {
        title: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        country?: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        customer: any;
    } | {
        success: boolean;
        message: any;
        customer?: undefined;
    }>;
    deleteCustomer(input: {
        customerTitle: string;
    }, ctx: ExecutionContext): Promise<{
        status: string;
        message: any;
    }>;
    createEntityGroup(input: {
        name: string;
        type: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        entityGroup: any;
    } | {
        success: boolean;
        message: any;
        entityGroup?: undefined;
    }>;
    deleteEntityGroup(input: {
        groupName: string;
        groupType: string;
    }, ctx: ExecutionContext): Promise<{
        status: string;
        message: any;
    }>;
    addEntitiesToGroup(input: {
        groupName: string;
        entityType: string;
        entityNames: string;
    }, ctx: ExecutionContext): Promise<{
        status: string;
        message: any;
    }>;
    removeEntitiesFromGroup(input: {
        groupName: string;
        entityType: string;
        entityNames: string;
    }, ctx: ExecutionContext): Promise<{
        status: string;
        message: any;
    }>;
}
//# sourceMappingURL=thingsboard.tools.d.ts.map