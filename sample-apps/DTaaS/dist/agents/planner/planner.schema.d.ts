export interface TwinSpecification {
    twinName: string;
    twinType: string;
    description?: string;
    devices: DeviceSpec[];
    dashboards: DashboardSpec[];
    ruleChains: RuleChainSpec[];
    alarms: AlarmSpec[];
    users?: UserSpec[];
}
export interface DeviceSpec {
    type: string;
    count: number;
    namePrefix?: string;
    label?: string;
    telemetry?: string[];
}
export interface DashboardSpec {
    name: string;
    template?: string;
}
export interface RuleChainSpec {
    name: string;
    template?: string;
}
export interface AlarmSpec {
    type: string;
    severity: "CRITICAL" | "MAJOR" | "MINOR" | "WARNING";
    condition: string;
}
export interface UserSpec {
    authority: "TENANT_ADMIN" | "CUSTOMER_USER";
    email: string;
    firstName?: string;
    lastName?: string;
}
//# sourceMappingURL=planner.schema.d.ts.map