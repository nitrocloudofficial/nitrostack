export declare class ThingsBoardService {
    private readonly TB_URL;
    private readonly API_KEY;
    private readonly headers;
    createDevice(deviceName: string, deviceType: string, label?: string): Promise<any>;
    saveAlarm(alarmData: any): Promise<any>;
    deleteAlarm(alarmId: string): Promise<any>;
    ackAlarm(alarmId: string): Promise<any>;
    createAsset(assetName: string, assetType: string, label?: string): Promise<any>;
    clearAlarm(alarmId: string): Promise<any>;
    getAlarmInfoById(alarmId: string): Promise<any>;
    getDeviceByName(deviceName: string): Promise<any>;
    deleteDevice(deviceId: string): Promise<any>;
    createCustomer(title: string, email?: string, phone?: string, address?: string, city?: string, country?: string): Promise<any>;
    getCustomerByTitle(customerTitle: string): Promise<any>;
    deleteCustomer(customerId: string): Promise<any>;
    getAlarms(entityType: string, entityId: string, params: any): Promise<any>;
    getAllAlarms(params: any): Promise<any>;
    getHighestAlarmSeverity(entityType: string, entityId: string, params: any): Promise<any>;
    getAlarmTypes(params: any): Promise<any>;
    getDeviceProfileById(profileId: string): Promise<any>;
    getDeviceProfileByName(profileName: string): Promise<any>;
    saveDeviceProfile(profileData: any): Promise<any>;
    createStandaloneAlarmRule(ruleData: any): Promise<any>;
    saveUser(userData: any, sendActivationMail?: boolean): Promise<any>;
    createEntityGroup(name: string, type: string): Promise<any>;
    getUserById(userId: string): Promise<any>;
    getEntityGroupsByType(entityType: string): Promise<any>;
    deleteEntityGroup(groupId: string): Promise<any>;
    deleteUser(userId: string): Promise<any>;
    getTenantUsers(params: any): Promise<any>;
    /**
     * ThingsBoard's delete endpoint needs an assetId, not a name.
     * This resolves the name -> id first.
     */
    getAssetByName(assetName: string): Promise<any>;
    deleteAsset(assetName: string): Promise<{
        deletedAssetId: any;
        status: number;
    }>;
    getActivationLink(userId: string): Promise<any>;
    /**
     * Searches or fetches device profile templates for emulator creation
     */
    getEmulatorCatalog(pageSize?: number): Promise<any>;
    /**
     * Provisions an emulator device entity in ThingsBoard
     */
    /**
     * Provisions an emulator device entity in ThingsBoard
     */
    createEmulatorDevice(deviceName: string, emulatorType?: string, scenario?: string, telemetryRateSeconds?: number): Promise<{
        device: any;
        emulatorType: string;
        scenario: string;
        telemetryRateSeconds: number;
        status: string;
    }>;
    addEntitiesToGroup(groupId: string, entityIds: string[]): Promise<any>;
    removeEntitiesFromGroup(groupId: string, entityIds: string[]): Promise<any>;
}
//# sourceMappingURL=thingsboard.service.d.ts.map