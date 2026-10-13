import { Injectable, ToolDecorator as Tool, Widget, z, ExecutionContext } from '@nitrostack/core';
import { WaferGenealogyService } from './wafer-genealogy.service.js';

@Injectable({ deps: [WaferGenealogyService] })
export class WaferGenealogyTools {
    constructor(private readonly genealogyService: WaferGenealogyService) { }

    @Tool({
        name: 'trace_wafer_genealogy',
        title: 'Wafer Batch Genealogy Trace',
        description: 'Traces the complete lifecycle of a wafer batch. Given a batchId (lotId), retrieves and structures records from Design, Manufacturing, Testing, Product Specs, and Shipping into a chronological lifecycle timeline. Returns the product identity, design revision history, manufacturing steps, test results, and physical shipping route. Use this when the user asks for the history, genealogy, lifecycle, or trace of a wafer lot.',
        inputSchema: z.object({
            batchId: z.string().describe('The wafer batch/lot ID to trace, e.g. LOT-8923'),
        }),
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
        },
        invocation: {
            invoking: 'Tracing wafer genealogy...',
            invoked: 'Genealogy trace complete',
        },
        examples: {
            request: { batchId: 'LOT-8923' },
            response: {
                batchId: 'LOT-8923',
                totalEvents: 7,
                product: {
                    productId: 'SERDES-PHY-BLOCK',
                    lotId: 'LOT-8923',
                    operatingVoltage: '1.2V ± 5%',
                    maxThermalThreshold: '105 °C',
                    complianceCertifications: ['RoHS Compliant', 'REACH Certified'],
                },
                phases: [
                    {
                        id: 'design',
                        name: 'Design',
                        color: '#8b5cf6',
                        steps: [
                            { timestamp: '2025-11-10T09:00:00Z', label: 'REV-SERDES-v2.3', description: 'Adjusted metal layer 4 trace spacing to satisfy DRC rules.', meta: { Designer: 'A. Sharma', 'IP Block': 'SERDES_PHY_BLOCK' } },
                            { timestamp: '2026-01-15T14:30:00Z', label: 'REV-SERDES-v2.4', description: 'Updated PLL loop filter bandwidth to improve jitter performance.', meta: { Designer: 'R. Chen', 'IP Block': 'SERDES_PHY_BLOCK' } },
                        ],
                    },
                    {
                        id: 'manufacturing',
                        name: 'Manufacturing',
                        color: '#f59e0b',
                        steps: [
                            { timestamp: '2026-02-10T08:00:00Z', label: 'FAB-HSINCHU-ETCH-07', description: 'POLY_SILICON_ETCH_V3', meta: { Pressure: '14.2 mTorr', Temperature: '185.4 °C' } },
                        ],
                    },
                    {
                        id: 'testing',
                        name: 'Testing',
                        color: '#10b981',
                        steps: [
                            { timestamp: '2026-03-05T10:00:00Z', label: 'Yield: 81.40%', description: '2000 wafers tested', meta: { Yield: '81.40%', 'Failing Bins': 'BIN_12_LEAKAGE (184)' } },
                        ],
                    },
                ],
                route: [
                    { leg: 1, origin: 'Taiwan (Hsinchu)', destination: 'United States (Austin TX)', eccnClassification: '3A090.a', hsCode: '8542.31.0000', applicableTariffs: '25% Section 301', status: 'Customs Hold', isBlocked: true },
                ],
                summary: 'SERDES-PHY-BLOCK (LOT-8923) — 7 events across 4 sources',
            },
        },
    })
    @Widget('wafer-lifecycle')
    async trace(input: { batchId: string }, ctx: ExecutionContext) {
        const batchId = String(input.batchId).replace(/^batchId:\s*/i, '').trim();
        ctx.logger.info(`Tracing wafer genealogy for batch: ${batchId}`);

        try {
            const result = await this.genealogyService.trace(batchId);
            ctx.logger.info(`Genealogy trace complete: ${result.totalEvents} events found`);

            return {
                batchId: result.batchId,
                totalEvents: result.totalEvents,
                product: result.widget?.product || null,
                phases: result.phases || [],
                route: result.route || [],
                summary: result.summary,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            ctx.logger.error(`Genealogy trace failed: ${message}`);
            return { error: message };
        }
    }
}
