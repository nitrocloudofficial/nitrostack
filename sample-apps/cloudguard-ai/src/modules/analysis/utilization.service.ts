import { Injectable } from '@nitrostack/core';
import { MetricsSeries } from '../../services/cloud-provider.adapter.js';

export type PatternType = 'flat_idle' | 'periodic_burst' | 'steady_load' | 'spiky';

export interface UtilizationResult {
    instanceId: string;
    pattern: PatternType;
    avgCpu: number;
    peakCpu: number;
    variance: number;
    spikeHourCount: number;
    explanation: string;
}

@Injectable()
export class UtilizationService {
    /**
     * Evaluates 168 hours of CPU data and calculates statistical indicators 
     * to classify usage into flat_idle, periodic_burst, steady_load, or spiky.
     */
    classify(metrics: MetricsSeries): UtilizationResult {
        const data = metrics?.cpuHourly ?? [];

        if (data.length === 0) {
            return {
                instanceId: metrics?.instanceId ?? 'unknown',
                pattern: 'flat_idle',
                avgCpu: 0,
                peakCpu: 0,
                variance: 0,
                spikeHourCount: 0,
                explanation: 'No metrics data available for evaluation.',
            };
        }

        // 1. Calculate Descriptive Statistics
        const sum = data.reduce((acc, val) => acc + val, 0);
        const avgCpu = Number((sum / data.length).toFixed(2));
        const peakCpu = Number(Math.max(...data).toFixed(2));

        // Calculate Variance (Variance = Σ(x - μ)² / N)
        const varianceSum = data.reduce((acc, val) => acc + Math.pow(val - avgCpu, 2), 0);
        const variance = Number((varianceSum / data.length).toFixed(2));

        // Count Spike Hours (> 80% CPU usage)
        const spikeHourCount = data.filter((val) => val >= 80).length;

        // 2. Pattern Classification Logic Rules
        let pattern: PatternType = 'flat_idle';
        let explanation = '';

        // Rule A: Flat Idle (Low average, no meaningful spikes anywhere)
        if (avgCpu <= 2.0 && peakCpu < 15.0) {
            pattern = 'flat_idle';
            explanation = `Flat idle workload identified: Average CPU is ${avgCpu}% across 168 hours with no peak above ${peakCpu}%.`;
        }
        // Rule B: Periodic Burst / ETL Trap (Low-to-moderate average, but consistent recurring spikes > 80%)
        else if (avgCpu < 30.0 && spikeHourCount >= 5 && peakCpu >= 80.0) {
            pattern = 'periodic_burst';
            explanation = `Periodic burst workload detected: Low average usage (${avgCpu}%), with ${spikeHourCount} recurring high-load spike hours reaching up to ${peakCpu}%. Typical scheduled batch/ETL processing behavior.`;
        }
        // Rule C: Steady Load (Consistent usage, controlled variance)
        else if (avgCpu >= 30.0 && variance < 200.0) {
            pattern = 'steady_load';
            explanation = `Steady load workload detected: High consistent average utilization (${avgCpu}%) with stable low variance (${variance}).`;
        }
        // Rule D: Spiky / Unpredictable (High variance, erratic peaks without clear seasonality)
        else {
            pattern = 'spiky';
            explanation = `Spiky/unpredictable workload detected: High variance (${variance}) with irregular CPU swings peaking at ${peakCpu}%.`;
        }

        return {
            instanceId: metrics.instanceId,
            pattern,
            avgCpu,
            peakCpu,
            variance,
            spikeHourCount,
            explanation,
        };
    }
}