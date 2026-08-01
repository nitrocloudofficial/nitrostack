import { z } from 'zod';

export const ComputeInstanceSchema = z.object({
    instanceId: z.string(),
    name: z.string(),
    instanceType: z.string(),
    state: z.enum(['running', 'stopped', 'terminated']),
    ownerTag: z.string(),
    teamTag: z.string(),
    costPerHour: z.number().positive(),
});

export const MetricsSeriesSchema = z.object({
    instanceId: z.string(),
    cpuHourly: z.array(z.number()).length(168),
});

export const DirectoryRecordSchema = z.object({
    ownerTag: z.string(),
    fullName: z.string(),
    email: z.string().email(),
    status: z.enum(['active', 'departed']),
    department: z.string(),
});

export const SecurityFindingSchema = z.object({
    id: z.string(),
    resourceId: z.string(),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    title: z.string(),
    description: z.string(),
});

export type ComputeInstance = z.infer<typeof ComputeInstanceSchema>;
export type MetricsSeries = z.infer<typeof MetricsSeriesSchema>;
export type DirectoryRecord = z.infer<typeof DirectoryRecordSchema>;
export type SecurityFinding = z.infer<typeof SecurityFindingSchema>;

// Pre-calculated Enterprise Insights for MCP Tools
export interface InstanceAuditInsight {
    instance: ComputeInstance;
    ownerDetails: DirectoryRecord | null;
    avgCpuUsage: number;
    peakCpuUsage: number;
    isZombieInstance: boolean;
    isBimodalEtl: boolean;
    monthlyCost: number;
    associatedSecurityFindings: SecurityFinding[];
}

export interface CloudProviderAdapter {
    getComputeInstances(): Promise<ComputeInstance[]>;
    getMetrics(instanceId: string): Promise<MetricsSeries | null>;
    getDirectory(): Promise<DirectoryRecord[]>;
    getSecurityFindings(): Promise<SecurityFinding[]>;

    // High-Level Intelligence Engine Methods
    getInstanceAudit(instanceId: string): Promise<InstanceAuditInsight | null>;
    getAllAuditInsights(): Promise<InstanceAuditInsight[]>;
    getZombieInstances(): Promise<InstanceAuditInsight[]>;
    getMonthlyCloudWasteDollars(): Promise<{ totalWastePerMonth: number; wasteCount: number }>;
}