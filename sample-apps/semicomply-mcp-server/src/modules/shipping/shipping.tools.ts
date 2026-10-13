import { Injectable, ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';
import { ShippingTradeService } from './shipping.service.js';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service.js';

@Injectable({ deps: [ShippingTradeService, GoogleSheetsService] })
export class ShippingTradeTools {
    constructor(
        private readonly shippingTradeService: ShippingTradeService,
        private readonly sheets: GoogleSheetsService,
    ) { }

    @Tool({
        name: 'get_shipping_and_trade_compliance',
        title: 'Shipping & Trade Compliance',
        description: 'Retrieves shipment logistics, export control classification (ECCN), HS code, tariffs, and customs hold status. Can be queried by shipment ID or by product ID to find all active shipments for a product. When the user asks about shipping restrictions for a product, use the productId parameter to find all related shipments and their compliance status. Returns route, export-control law (ECCN), taxes (tariffs + HS code), and order/customs status.',
        inputSchema: z.object({
            shipmentId: z.string().optional().describe('The tracking/shipment ID, e.g. SHIP-2026-04471. Use this to look up a specific shipment.'),
            productId: z.string().optional().describe('The product ID to find all shipments containing this product, e.g. SERDES-PHY-BLOCK. Use this when the user asks about shipping restrictions, routes, or compliance for a specific product.'),
        }),
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
        },
    })
    async getCompliance(
        input: { shipmentId?: string; productId?: string },
        ctx: ExecutionContext,
    ) {
        if (input.productId) {
            const productId = String(input.productId).replace(/^productId:\s*/i, '').trim();
            ctx.logger.info(`Fetching shipping compliance for product: ${productId}`);
            const shipments = await this.shippingTradeService.getByProductId(productId);
            if (shipments.length === 0) {
                return { error: `No shipments found for product ${productId}.` };
            }
            return {
                productId,
                totalShipments: shipments.length,
                shipments: shipments.map((s) => ({
                    shipmentId: s.shipmentId,
                    origin: s.origin,
                    destination: s.destination,
                    eccnClassification: s.eccnClassification,
                    hsCode: s.hsCode,
                    applicableTariffs: s.applicableTariffs,
                    status: s.status,
                })),
            };
        }

        if (input.shipmentId) {
            const shipmentId = String(input.shipmentId).replace(/^shipmentId:\s*/i, '').trim();
            ctx.logger.info(`Fetching shipping compliance for: ${shipmentId}`);
            const compliance = await this.shippingTradeService.getCompliance(shipmentId);
            if (!compliance) {
                return { error: `Shipment ${shipmentId} not found in ERP system.` };
            }
            return compliance;
        }

        return { error: 'Please provide either a shipmentId or productId.' };
    }

    @Tool({
        name: 'create_shipment',
        title: 'Create Shipment',
        description: 'Creates a new shipment record with origin, destination, export classification (ECCN), HS code, tariffs, and status. Use this when the user wants to log a new shipment, create a trade route, or register a shipment for a product.',
        inputSchema: z.object({
            productId: z.string().describe('The product being shipped, e.g. SERDES-PHY-BLOCK'),
            lotId: z.string().describe('The lot ID being shipped, e.g. LOT-8923'),
            origin: z.string().describe('Origin location, e.g. Taiwan (Hsinchu)'),
            destination: z.string().describe('Destination location, e.g. United States (Austin TX)'),
            eccnClassification: z.string().describe('ECCN classification with description, e.g. 3A090.a (Export Controlled)'),
            hsCode: z.string().describe('HS code, e.g. 8542.31.0000'),
            applicableTariffs: z.string().describe('Applicable tariffs, e.g. 25% Section 301 Tariff + 2.5% Base Duty'),
            status: z.string().describe('Initial shipment status, e.g. Cleared: Awaiting Carrier Pickup'),
            routeOrder: z.number().describe('Leg number in the supply chain route, e.g. 1'),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
        },
        invocation: {
            invoking: 'Creating shipment...',
            invoked: 'Shipment created',
        },
    })
    async createShipment(
        input: { productId: string; lotId: string; origin: string; destination: string; eccnClassification: string; hsCode: string; applicableTariffs: string; status: string; routeOrder: number },
        ctx: ExecutionContext,
    ) {
        const productId = String(input.productId).replace(/^productId:\s*/i, '').trim();
        const lotId = String(input.lotId).replace(/^lotId:\s*/i, '').trim();
        const origin = String(input.origin).replace(/^origin:\s*/i, '').trim();
        const destination = String(input.destination).replace(/^destination:\s*/i, '').trim();
        const eccnClassification = String(input.eccnClassification).replace(/^eccnClassification:\s*/i, '').trim();
        const hsCode = String(input.hsCode).replace(/^hsCode:\s*/i, '').trim();
        const applicableTariffs = String(input.applicableTariffs).replace(/^applicableTariffs:\s*/i, '').trim();
        const status = String(input.status).replace(/^status:\s*/i, '').trim();
        const routeOrder = input.routeOrder;
        const timestamp = new Date().toISOString();

        // Auto-generate shipment ID: SHIP-YYYY-#####
        const year = new Date().getFullYear();
        const existing = await this.sheets.fetchSheet('Shipping');
        const sameYear = existing.filter((r) => r.shipmentId?.startsWith(`SHIP-${year}-`));
        let maxNum = 0;
        for (const row of sameYear) {
            const match = row.shipmentId?.match(/SHIP-\d{4}-(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        }
        const shipmentId = `SHIP-${year}-${String(maxNum + 1).padStart(5, '0')}`;

        ctx.logger.info(`Creating shipment: ${shipmentId}`);

        await this.sheets.appendRow('Shipping', [
            shipmentId,
            productId,
            lotId,
            origin,
            destination,
            eccnClassification,
            hsCode,
            applicableTariffs,
            status,
            String(routeOrder),
            timestamp,
        ]);

        return {
            shipmentId,
            productId,
            lotId,
            origin,
            destination,
            eccnClassification,
            hsCode,
            applicableTariffs,
            status,
            routeOrder,
            timestamp,
            message: `Shipment ${shipmentId} created successfully.`,
        };
    }
}
