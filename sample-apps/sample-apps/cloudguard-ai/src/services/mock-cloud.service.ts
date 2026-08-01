import * as fs from 'fs/promises';
import * as path from 'path';
import { Injectable } from '@nitrostack/core';
import { z } from 'zod';
import {
    CloudProviderAdapter,
    ComputeInstance,
    ComputeInstanceSchema,
    MetricsSeries,
    MetricsSeriesSchema,
    DirectoryRecord,
    DirectoryRecordSchema,
    SecurityFinding,
    SecurityFindingSchema,
    InstanceAuditInsight,
} from './cloud-provider.adapter.js';

@Injectable()
export class MockCloudService implements CloudProviderAdapter {
    private readonly dataDir: string;
    private readonly cache = new Map<string, { data: unknown; timestamp: number }>();
    private readonly CACHE_TTL_MS = 5000; // 5-second TTL cache for fast AI agent queries

    constructor() {
        this.dataDir = path.join(process.cwd(), 'data', 'mock');
    }

    private async readAndValidate<T>(
        filename: string,
        schema: z.ZodSchema<T[]>
    ): Promise<T[]> {
        const cached = this.cache.get(filename);
        const now = Date.now();

        if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
            return cached.data as T[];
        }

        try {
            const filePath = path.join(this.dataDir, filename);
            const rawData = await fs.readFile(filePath, 'utf8');
            const json = JSON.parse(rawData);

            const parseResult = schema.safeParse(json);
            if (!parseResult.success) {
                console.error(`[MockCloudService] Schema error in ${filename}:`, parseResult.error.format());
                return [];
            }

            this.cache.set(filename, { data: parseResult.data, timestamp: now });
            return parseResult.data;
        } catch (error) {
            console.error(`[MockCloudService] Read error for ${filename}:`, error);
            return [];
        }
    }

    // --- Base Data Fetchers ---
    async getComputeInstances(): Promise<ComputeInstance[]> {
        return this.readAndValidate('compute.json', z.array(ComputeInstanceSchema));
    }

    async getMetrics(instanceId: string): Promise<MetricsSeries | null> {
        if (!instanceId || typeof instanceId !== 'string') return null;
        const allMetrics = await this.readAndValidate('metrics.json', z.array(MetricsSeriesSchema));
        return allMetrics.find((item) => item.instanceId === instanceId) ?? null;
    }

    async getDirectory(): Promise<DirectoryRecord[]> {
        return this.readAndValidate('org_directory.json', z.array(DirectoryRecordSchema));
    }

    async getSecurityFindings(): Promise<SecurityFinding[]> {
        return this.readAndValidate('security_findings.json', z.array(SecurityFindingSchema));
    }

    // --- INTELLIGENCE & ANALYTICS ENGINE ---
    async getInstanceAudit(instanceId: string): Promise<InstanceAuditInsight | null> {
        const [instances, directory, findings] = await Promise.all([
            this.getComputeInstances(),
            this.getDirectory(),
            this.getSecurityFindings(),
        ]);

        const instance = instances.find((i) => i.instanceId === instanceId);
        if (!instance) return null;

        const metrics = await this.getMetrics(instanceId);
        const cpuData = metrics?.cpuHourly ?? [];

        const totalCpu = cpuData.reduce((acc, val) => acc + val, 0);
        const avgCpuUsage = cpuData.length > 0 ? Number((totalCpu / cpuData.length).toFixed(2)) : 0;
        const peakCpuUsage = cpuData.length > 0 ? Math.max(...cpuData) : 0;

        const ownerDetails = directory.find((d) => d.ownerTag === instance.ownerTag) ?? null;

        // Smart logic: Bimodal ETL vs. Abandoned Zombie instance
        const isBimodalEtl = avgCpuUsage < 15 && peakCpuUsage > 80;
        const isOwnerDeparted = ownerDetails?.status === 'departed';
        const isZombieInstance = (isOwnerDeparted || avgCpuUsage < 2.0) && !isBimodalEtl;

        const monthlyCost = Number((instance.costPerHour * 730).toFixed(2));
        const associatedSecurityFindings = findings.filter(
            (f) => f.resourceId === instance.instanceId || f.resourceId.includes(instance.instanceId)
        );

        return {
            instance,
            ownerDetails,
            avgCpuUsage,
            peakCpuUsage,
            isZombieInstance,
            isBimodalEtl,
            monthlyCost,
            associatedSecurityFindings,
        };
    }

    async getAllAuditInsights(): Promise<InstanceAuditInsight[]> {
        const instances = await this.getComputeInstances();
        const audits = await Promise.all(instances.map((i) => this.getInstanceAudit(i.instanceId)));
        return audits.filter((a): a is InstanceAuditInsight => a !== null);
    }

    async getZombieInstances(): Promise<InstanceAuditInsight[]> {
        const allAudits = await this.getAllAuditInsights();
        return allAudits.filter((a) => a.isZombieInstance);
    }

    async getMonthlyCloudWasteDollars(): Promise<{ totalWastePerMonth: number; wasteCount: number }> {
        const zombies = await this.getZombieInstances();
        const totalWastePerMonth = zombies.reduce((sum, z) => sum + z.monthlyCost, 0);

        return {
            totalWastePerMonth: Number(totalWastePerMonth.toFixed(2)),
            wasteCount: zombies.length,
        };
    }
}