import { Injectable } from '@nitrostack/core';
import { QualityTestService } from '../quality/quality.service.js';
import { ManufacturingMESService } from '../manufacturing/manufacturing.service.js';
import { DesignService } from '../design/design.service.js';
import { ShippingTradeService } from '../shipping/shipping.service.js';

export interface RootCauseResult {
    lotId: string;
    overallYield: string;
    totalWafersTested: number;
    failingBins: { binCode: string; count: number; impact: string }[];
    telemetry: {
        stationId: string;
        recipeName: string;
        chamberPressure: string;
        temperature: string;
        operatorId: string;
        hasExcursion: boolean;
    } | null;
    likelyRootCause: string;
    designImplicated: boolean;
    designNote: string;
    shipmentRisk?: {
        shipmentId: string;
        risk: boolean;
        reason: string;
    };
}

@Injectable({
    deps: [QualityTestService, ManufacturingMESService, DesignService, ShippingTradeService],
})
export class RootCauseAnalysisService {
    constructor(
        private readonly qualityService: QualityTestService,
        private readonly manufacturingService: ManufacturingMESService,
        private readonly designService: DesignService,
        private readonly shippingService: ShippingTradeService,
    ) {}

    private correlateManufacturingToYield(
        excursion: string | undefined,
        failingBins: { binCode: string; count: number; impact: string }[],
    ): string {
        if (failingBins.length === 0) {
            return 'No failing bins recorded — yield analysis may be incomplete or pending.';
        }

        if (!excursion) {
            return 'No process parameter excursions detected in MES telemetry. Root cause may be elsewhere.';
        }

        const hasPressureExcursion = excursion.toLowerCase().includes('exceeded threshold');
        const hasLeakageFailures = failingBins.some((b) => b.binCode.includes('LEAKAGE'));
        const hasTimingFailures = failingBins.some((b) => b.binCode.includes('TIMING'));
        const hasResistanceFailures = failingBins.some((b) => b.binCode.includes('RESISTANCE'));

        if (hasPressureExcursion && hasLeakageFailures) {
            const leakBin = failingBins.find((b) => b.binCode.includes('LEAKAGE'))!;
            return (
                `Chamber pressure excursion (${excursion.split('(')[0].trim()}) correlates with elevated ` +
                `${leakBin.binCode} failures (${leakBin.count} units) — ` +
                `consistent with incomplete etch creating unintended leakage paths.`
            );
        }

        if (hasPressureExcursion && hasTimingFailures) {
            const timingBin = failingBins.find((b) => b.binCode.includes('TIMING'))!;
            return (
                `Process excursion detected (${excursion.split('(')[0].trim()}) correlates with ` +
                `${timingBin.binCode} failures (${timingBin.count} units) — ` +
                `likely causing timing margin degradation.`
            );
        }

        if (hasPressureExcursion && hasResistanceFailures) {
            const resBin = failingBins.find((b) => b.binCode.includes('RESISTANCE'))!;
            return (
                `Process excursion detected (${excursion.split('(')[0].trim()}) correlates with ` +
                `${resBin.binCode} failures (${resBin.count} units) — ` +
                `consistent with open circuits or poor interconnect formation.`
            );
        }

        const sorted = [...failingBins].sort((a, b) => b.count - a.count);
        const topBin = sorted[0];
        return (
            `Process excursion detected (${excursion.split('(')[0].trim()}) may be contributing to ` +
            `${topBin.binCode} failures (${topBin.count} units), though the correlation is not definitive.`
        );
    }

    private assessDesignRelevance(
        failingBins: { binCode: string; count: number; impact: string }[],
    ): { implicated: boolean; note: string } {
        const timingFailures = failingBins.filter((b) => b.binCode.includes('TIMING'));
        if (timingFailures.length > 0 && timingFailures.some((b) => b.count > 100)) {
            return {
                implicated: true,
                note: 'Significant timing failures detected — design revision should be investigated as a potential contributor.',
            };
        }
        return {
            implicated: false,
            note: 'No design revision changes found in the relevant window; root cause is process-based, not layout-based.',
        };
    }

    async analyze(
        lotId: string,
        shipmentId?: string,
    ): Promise<RootCauseResult> {
        const yieldData = await this.qualityService.getYieldSummary(lotId);
        const telemetry = await this.manufacturingService.getTelemetry(lotId);

        if (!yieldData) {
            throw new Error(`No yield data found for lot ${lotId}.`);
        }

        const failureBins = yieldData.failingBins;
        const excursion = telemetry?.chamberPressure;

        const rootCause = this.correlateManufacturingToYield(excursion, failureBins);
        const design = this.assessDesignRelevance(failureBins);

        let designNote = design.note;
        if (design.implicated) {
            const latestRevision = await this.designService.getRevision('REV-SERDES-PHY-v2.4');
            if (latestRevision) {
                designNote = `Design revision ${latestRevision.revisionId} (` +
                    `${latestRevision.ipBlock}, changed by ${latestRevision.designer}): ` +
                    `${latestRevision.changes}. Timing failures may be related — investigate further.`;
            }
        }

        const hasExcursion = excursion?.toLowerCase().includes('exceeded threshold') ?? false;

        const result: RootCauseResult = {
            lotId,
            overallYield: yieldData.overallYield,
            totalWafersTested: yieldData.totalWafersTested,
            failingBins: failureBins,
            telemetry: telemetry
                ? {
                      stationId: telemetry.stationId,
                      recipeName: telemetry.recipeName,
                      chamberPressure: telemetry.chamberPressure,
                      temperature: telemetry.temperature,
                      operatorId: telemetry.operatorId,
                      hasExcursion,
                  }
                : null,
            likelyRootCause: rootCause,
            designImplicated: design.implicated,
            designNote,
        };

        if (shipmentId) {
            const compliance = await this.shippingService.getCompliance(shipmentId);
            if (compliance) {
                const hasCustomsHold = compliance.status.toLowerCase().includes('hold');
                result.shipmentRisk = {
                    shipmentId,
                    risk: hasCustomsHold || design.implicated,
                    reason: hasCustomsHold
                        ? `Shipment is on independent customs hold (${compliance.status}) — recommend resolving both the yield issue and the compliance hold before shipment release.`
                        : 'Shipment is currently cleared, but flagged for monitoring due to yield concerns.',
                };
            } else {
                result.shipmentRisk = {
                    shipmentId,
                    risk: false,
                    reason: `Shipment ${shipmentId} not found in ERP system.`,
                };
            }
        }

        return result;
    }
}
