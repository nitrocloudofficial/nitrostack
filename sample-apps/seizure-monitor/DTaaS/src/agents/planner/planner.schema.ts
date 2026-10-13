import { z } from "zod";

export const DeviceSchema = z.object({
    type: z.string(),
    count: z.number().int().positive(),
    namePrefix: z.string().optional(),
    label: z.string().optional()
});

export const DashboardSchema = z.object({
    name: z.string()
});

export const RuleChainSchema = z.object({
    name: z.string()
});

export const UserSchema = z.object({
    email: z.string().email(),
    authority: z.enum([
        "TENANT_ADMIN",
        "CUSTOMER_USER"
    ]),
    firstName: z.string().optional(),
    lastName: z.string().optional()
});

export const AlarmSchema = z.object({
    type: z.string(),
    severity: z.enum([
        "CRITICAL",
        "MAJOR",
        "MINOR",
        "WARNING",
        "INDETERMINATE"
    ]),
    condition: z.any().optional()
});

export const CustomerSchema = z.object({
    title: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional()
});

export const EmulatorSchema = z.object({
    deviceName: z.string(),
    emulatorType: z.string().default("smart-home-energy-hub"),
    scenario: z.string().default("Typical Day"),
    telemetryRateSeconds: z.number().default(5)
});

export const TwinSpecificationSchema = z.object({

    twinName: z.string(),

    twinType: z.string(),

    devices: z.array(DeviceSchema).default([]),

    dashboards: z.array(DashboardSchema).default([]),

    ruleChains: z.array(RuleChainSchema).default([]),

    alarms: z.array(AlarmSchema).default([]),

    users: z.array(UserSchema).default([]),

    customers: z.array(CustomerSchema).default([]),

    emulators: z.array(EmulatorSchema).default([])

});

export type TwinSpecification =
    z.infer<typeof TwinSpecificationSchema>;