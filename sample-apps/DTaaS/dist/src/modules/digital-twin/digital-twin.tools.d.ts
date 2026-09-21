import { ExecutionContext } from "@nitrostack/core";
export declare class DigitalTwinTools {
    getSmartHomePrompt(args: Record<string, any>, ctx: ExecutionContext): Promise<{
        role: "user";
        content: string;
    }[]>;
    getSmartFactoryPrompt(args: Record<string, any>, ctx: ExecutionContext): Promise<{
        role: "user";
        content: string;
    }[]>;
    createDigitalTwin(input: {
        prompt: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        specification: {
            alarms: {
                type: string;
                severity: "CRITICAL" | "MAJOR" | "MINOR" | "WARNING" | "INDETERMINATE";
                condition?: any;
            }[];
            users: {
                email: string;
                authority: "TENANT_ADMIN" | "CUSTOMER_USER";
                firstName?: string | undefined;
                lastName?: string | undefined;
            }[];
            dashboards: {
                name: string;
            }[];
            twinName: string;
            twinType: string;
            devices: {
                type: string;
                count: number;
                label?: string | undefined;
                namePrefix?: string | undefined;
            }[];
            ruleChains: {
                name: string;
            }[];
            customers: {
                title: string;
                email?: string | undefined;
                phone?: string | undefined;
                address?: string | undefined;
                city?: string | undefined;
                country?: string | undefined;
            }[];
            emulators: {
                deviceName: string;
                emulatorType: string;
                scenario: string;
                telemetryRateSeconds: number;
            }[];
        };
        graph: import("../../agents/twin-graph.js").TwinGraph;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        specification?: undefined;
        graph?: undefined;
    }>;
}
//# sourceMappingURL=digital-twin.tools.d.ts.map