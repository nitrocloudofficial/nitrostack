import { Injectable } from '@nitrostack/core';
import { GenealogyContributorRegistry } from './genealogy-registry.js';
import { GenealogyEvent, GenealogyResult, RouteStop, LifecyclePhase, ProductInfo, LifecycleStep } from './genealogy-types.js';
import { ManufacturingContributor } from './contributors/manufacturing.contributor.js';
import { QualityContributor } from './contributors/quality.contributor.js';
import { DesignContributor } from './contributors/design.contributor.js';
import { ProductContributor } from './contributors/product.contributor.js';
import { ShippingContributor } from './contributors/shipping.contributor.js';

@Injectable({
    deps: [
        GenealogyContributorRegistry,
        ManufacturingContributor,
        QualityContributor,
        DesignContributor,
        ProductContributor,
        ShippingContributor,
    ],
})
export class WaferGenealogyService {
    constructor(
        private readonly registry: GenealogyContributorRegistry,
        private readonly mfgContributor: ManufacturingContributor,
        private readonly qualityContributor: QualityContributor,
        private readonly designContributor: DesignContributor,
        private readonly productContributor: ProductContributor,
        private readonly shippingContributor: ShippingContributor,
    ) {
        this.registry.register(this.mfgContributor);
        this.registry.register(this.qualityContributor);
        this.registry.register(this.designContributor);
        this.registry.register(this.productContributor);
        this.registry.register(this.shippingContributor);
    }

    async trace(batchId: string): Promise<GenealogyResult> {
        const contributors = this.registry.getContributors();
        const allEvents: GenealogyEvent[] = [];

        const results = await Promise.allSettled(
            contributors.map((c) => c.fetchEvents(batchId)),
        );

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const name = contributors[i]?.sourceName || `Contributor ${i}`;
            if (result.status === 'fulfilled') {
                allEvents.push(...result.value);
            } else {
                console.error(`[Genealogy] Contributor "${name}" failed:`, result.reason);
            }
        }

        allEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const product = this.extractProduct(allEvents);
        const phases = this.buildPhases(allEvents, product);
        const route = this.buildRoute(allEvents);
        const summary = this.buildSummary(batchId, product, phases, route);

        return {
            batchId,
            totalEvents: allEvents.length,
            timeline: allEvents,
            summary,
            route,
            phases,
            widget: {
                batchId,
                product,
                phases,
                route,
            },
        };
    }

    private extractProduct(events: GenealogyEvent[]): ProductInfo | null {
        const productEvent = events.find((e) => e.source === 'Product Specs');
        if (!productEvent) return null;

        const d = productEvent.details;
        let certs: string[] = [];
        if (Array.isArray(d.complianceCertifications)) {
            certs = d.complianceCertifications as string[];
        } else if (typeof d.complianceCertifications === 'string') {
            certs = (d.complianceCertifications as string).split(';').map((s) => s.trim()).filter(Boolean);
        }

        return {
            productId: String(d.productId || ''),
            lotId: String(d.lotId || ''),
            datasheetUrl: String(d.datasheetUrl || ''),
            operatingVoltage: String(d.operatingVoltage || ''),
            maxThermalThreshold: String(d.maxThermalThreshold || ''),
            complianceCertifications: certs,
        };
    }

    private buildPhases(events: GenealogyEvent[], product: ProductInfo | null): LifecyclePhase[] {
        const phases: LifecyclePhase[] = [];

        // Phase 1: Product identity
        if (product) {
            phases.push({
                id: 'product',
                name: product.productId,
                color: '#6366f1',
                steps: [{
                    timestamp: events[0]?.timestamp || new Date().toISOString(),
                    label: 'Product Identity',
                    description: `${product.productId} • ${product.operatingVoltage} • ${product.maxThermalThreshold} max`,
                    meta: {
                        Lot: product.lotId,
                        Voltage: product.operatingVoltage,
                        'Thermal Limit': product.maxThermalThreshold,
                        Certifications: product.complianceCertifications.join(', '),
                    },
                }],
            });
        }

        // Phase 2: Design
        const designEvents = events.filter((e) => e.source === 'Design Revisions');
        if (designEvents.length > 0) {
            const steps: LifecycleStep[] = designEvents.map((e) => ({
                timestamp: e.timestamp,
                label: `${e.details.revisionId}`,
                description: String(e.details.changes || ''),
                meta: {
                    Designer: String(e.details.designer || ''),
                    'IP Block': String(e.details.ipBlock || ''),
                },
            }));
            phases.push({
                id: 'design',
                name: 'Design',
                color: '#8b5cf6',
                steps,
            });
        }

        // Phase 3: Manufacturing
        const mfgEvents = events.filter((e) => e.source === 'MES Telemetry');
        if (mfgEvents.length > 0) {
            const steps: LifecycleStep[] = mfgEvents.map((e) => ({
                timestamp: e.timestamp,
                label: String(e.details.stationId || ''),
                description: String(e.details.recipeName || ''),
                meta: {
                    Pressure: String(e.details.chamberPressure || ''),
                    Temperature: String(e.details.temperature || ''),
                    Operator: String(e.details.operatorId || ''),
                },
            }));
            phases.push({
                id: 'manufacturing',
                name: 'Manufacturing',
                color: '#f59e0b',
                steps,
            });
        }

        // Phase 4: Testing
        const testEvents = events.filter((e) => e.source === 'Quality & Test');
        if (testEvents.length > 0) {
            const steps: LifecycleStep[] = testEvents.map((e) => {
                const bins = e.details.failingBins as { binCode: string; count: number; impact: string }[] | undefined;
                const binSummary = Array.isArray(bins) && bins.length > 0
                    ? bins.map((b) => `${b.binCode} (${b.count})`).join(', ')
                    : 'None';
                return {
                    timestamp: e.timestamp,
                    label: `Yield: ${e.details.overallYield}`,
                    description: `${e.details.totalWafersTested} wafers tested`,
                    meta: {
                        Yield: String(e.details.overallYield || ''),
                        'Wafers Tested': String(e.details.totalWafersTested || ''),
                        'Failing Bins': binSummary,
                    },
                };
            });
            phases.push({
                id: 'testing',
                name: 'Testing',
                color: '#10b981',
                steps,
            });
        }

        // Phase 5: Shipping (handled separately as route)
        return phases;
    }

    private buildRoute(events: GenealogyEvent[]): RouteStop[] {
        const shippingEvents = events.filter((e) => e.source === 'Shipping & Trade');

        return shippingEvents
            .map((event) => {
                const d = event.details;
                const status = String(d.status || '');
                const isBlocked = status.toLowerCase().includes('hold') || status.toLowerCase().includes('blocked');
                return {
                    leg: (d.routeOrder as number) || 0,
                    origin: String(d.origin || ''),
                    destination: String(d.destination || ''),
                    eccnClassification: String(d.eccnClassification || ''),
                    hsCode: String(d.hsCode || ''),
                    applicableTariffs: String(d.applicableTariffs || ''),
                    status,
                    isBlocked,
                };
            })
            .sort((a, b) => a.leg - b.leg);
    }

    private buildSummary(
        batchId: string,
        product: ProductInfo | null,
        phases: LifecyclePhase[],
        route: RouteStop[],
    ): string {
        const lines: string[] = [];
        const productName = product?.productId || batchId;

        lines.push(`${productName} (${batchId}) — Lifecycle Genealogy`);
        lines.push('');

        for (const phase of phases) {
            lines.push(`[${phase.name}]`);
            for (const step of phase.steps) {
                const date = new Date(step.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                lines.push(`  ${date} — ${step.label}`);
                lines.push(`    ${step.description}`);
                for (const [k, v] of Object.entries(step.meta)) {
                    lines.push(`    ${k}: ${v}`);
                }
            }
            lines.push('');
        }

        if (route.length > 0) {
            lines.push('[Shipping Route]');
            for (const stop of route) {
                const date = new Date(stop.origin).toLocaleDateString?.('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) || '';
                const arrow = stop.isBlocked ? 'BLOCKED' : '→';
                lines.push(`  Leg ${stop.leg}: ${stop.origin} ${arrow} ${stop.destination} — ${stop.status}`);
                lines.push(`    ECCN: ${stop.eccnClassification} | HS: ${stop.hsCode} | Tariffs: ${stop.applicableTariffs}`);
            }
        }

        return lines.join('\n');
    }
}
