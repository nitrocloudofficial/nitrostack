import { z } from "zod";
export declare const DeviceSchema: z.ZodObject<{
    type: z.ZodString;
    count: z.ZodNumber;
    namePrefix: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    count: number;
    label?: string | undefined;
    namePrefix?: string | undefined;
}, {
    type: string;
    count: number;
    label?: string | undefined;
    namePrefix?: string | undefined;
}>;
export declare const DashboardSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const RuleChainSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const UserSchema: z.ZodObject<{
    email: z.ZodString;
    authority: z.ZodEnum<["TENANT_ADMIN", "CUSTOMER_USER"]>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    authority: "TENANT_ADMIN" | "CUSTOMER_USER";
    firstName?: string | undefined;
    lastName?: string | undefined;
}, {
    email: string;
    authority: "TENANT_ADMIN" | "CUSTOMER_USER";
    firstName?: string | undefined;
    lastName?: string | undefined;
}>;
export declare const AlarmSchema: z.ZodObject<{
    type: z.ZodString;
    severity: z.ZodEnum<["CRITICAL", "MAJOR", "MINOR", "WARNING", "INDETERMINATE"]>;
    condition: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    type: string;
    severity: "CRITICAL" | "MAJOR" | "MINOR" | "WARNING" | "INDETERMINATE";
    condition?: any;
}, {
    type: string;
    severity: "CRITICAL" | "MAJOR" | "MINOR" | "WARNING" | "INDETERMINATE";
    condition?: any;
}>;
export declare const CustomerSchema: z.ZodObject<{
    title: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    email?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    country?: string | undefined;
}, {
    title: string;
    email?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    country?: string | undefined;
}>;
export declare const EmulatorSchema: z.ZodObject<{
    deviceName: z.ZodString;
    emulatorType: z.ZodDefault<z.ZodString>;
    scenario: z.ZodDefault<z.ZodString>;
    telemetryRateSeconds: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    deviceName: string;
    emulatorType: string;
    scenario: string;
    telemetryRateSeconds: number;
}, {
    deviceName: string;
    emulatorType?: string | undefined;
    scenario?: string | undefined;
    telemetryRateSeconds?: number | undefined;
}>;
export declare const TwinSpecificationSchema: z.ZodObject<{
    twinName: z.ZodString;
    twinType: z.ZodString;
    devices: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        count: z.ZodNumber;
        namePrefix: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        count: number;
        label?: string | undefined;
        namePrefix?: string | undefined;
    }, {
        type: string;
        count: number;
        label?: string | undefined;
        namePrefix?: string | undefined;
    }>, "many">>;
    dashboards: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
    }, {
        name: string;
    }>, "many">>;
    ruleChains: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
    }, {
        name: string;
    }>, "many">>;
    alarms: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        severity: z.ZodEnum<["CRITICAL", "MAJOR", "MINOR", "WARNING", "INDETERMINATE"]>;
        condition: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        severity: "CRITICAL" | "MAJOR" | "MINOR" | "WARNING" | "INDETERMINATE";
        condition?: any;
    }, {
        type: string;
        severity: "CRITICAL" | "MAJOR" | "MINOR" | "WARNING" | "INDETERMINATE";
        condition?: any;
    }>, "many">>;
    users: z.ZodDefault<z.ZodArray<z.ZodObject<{
        email: z.ZodString;
        authority: z.ZodEnum<["TENANT_ADMIN", "CUSTOMER_USER"]>;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        authority: "TENANT_ADMIN" | "CUSTOMER_USER";
        firstName?: string | undefined;
        lastName?: string | undefined;
    }, {
        email: string;
        authority: "TENANT_ADMIN" | "CUSTOMER_USER";
        firstName?: string | undefined;
        lastName?: string | undefined;
    }>, "many">>;
    customers: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        email?: string | undefined;
        phone?: string | undefined;
        address?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
    }, {
        title: string;
        email?: string | undefined;
        phone?: string | undefined;
        address?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
    }>, "many">>;
    emulators: z.ZodDefault<z.ZodArray<z.ZodObject<{
        deviceName: z.ZodString;
        emulatorType: z.ZodDefault<z.ZodString>;
        scenario: z.ZodDefault<z.ZodString>;
        telemetryRateSeconds: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        deviceName: string;
        emulatorType: string;
        scenario: string;
        telemetryRateSeconds: number;
    }, {
        deviceName: string;
        emulatorType?: string | undefined;
        scenario?: string | undefined;
        telemetryRateSeconds?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
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
}, {
    twinName: string;
    twinType: string;
    alarms?: {
        type: string;
        severity: "CRITICAL" | "MAJOR" | "MINOR" | "WARNING" | "INDETERMINATE";
        condition?: any;
    }[] | undefined;
    users?: {
        email: string;
        authority: "TENANT_ADMIN" | "CUSTOMER_USER";
        firstName?: string | undefined;
        lastName?: string | undefined;
    }[] | undefined;
    dashboards?: {
        name: string;
    }[] | undefined;
    devices?: {
        type: string;
        count: number;
        label?: string | undefined;
        namePrefix?: string | undefined;
    }[] | undefined;
    ruleChains?: {
        name: string;
    }[] | undefined;
    customers?: {
        title: string;
        email?: string | undefined;
        phone?: string | undefined;
        address?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
    }[] | undefined;
    emulators?: {
        deviceName: string;
        emulatorType?: string | undefined;
        scenario?: string | undefined;
        telemetryRateSeconds?: number | undefined;
    }[] | undefined;
}>;
export type TwinSpecification = z.infer<typeof TwinSpecificationSchema>;
//# sourceMappingURL=planner.schema.d.ts.map