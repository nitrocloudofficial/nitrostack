export declare class ThingsBoardClientService {
    private readonly TB_URL;
    private readonly API_KEY;
    private readonly USERNAME;
    private readonly PASSWORD;
    private jwtToken;
    private client;
    constructor();
    /**
     * Get request headers with authentication
     */
    private getHeaders;
    /**
     * Login to ThingsBoard to retrieve a JWT token
     */
    private login;
    /**
     * Execute a request with automatic JWT refresh and retry logic
     */
    private executeWithRetry;
    /**
     * Verify a device exists in ThingsBoard
     */
    getDeviceById(deviceId: string): Promise<any>;
    /**
     * Get all telemetry keys for a device
     */
    getTelemetryKeys(deviceId: string): Promise<string[]>;
    /**
     * Fetch historical telemetry for a range of timestamps
     */
    getTelemetryRange(deviceId: string, keys: string[], startTs: number, endTs: number): Promise<Record<string, Array<{
        ts: number;
        value: any;
    }>>>;
}
export declare const thingsboardClientService: ThingsBoardClientService;
//# sourceMappingURL=thingsboard-client.service.d.ts.map