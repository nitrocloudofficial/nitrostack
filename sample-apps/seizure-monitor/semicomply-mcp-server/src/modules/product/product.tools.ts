import { Injectable, ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';
import { ProductDocService } from './product.service.js';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service.js';

@Injectable({ deps: [ProductDocService, GoogleSheetsService] })
export class ProductDocTools {
    constructor(
        private readonly productDocService: ProductDocService,
        private readonly sheets: GoogleSheetsService,
    ) { }

    @Tool({
        name: 'get_product_datasheet_specs',
        title: 'Product Datasheet & Compliance Specs',
        description: 'Searches document repositories for a product\'s official datasheet, operating voltage limits, thermal thresholds, and compliance certifications.',
        inputSchema: z.object({
            productId: z.string().describe('The product ID or part number, e.g. SERDES-PHY-BLOCK'),
        }),
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
        },
    })
    async getSpecs(input: { productId: string }, ctx: ExecutionContext) {
        const productId = String(input.productId).replace(/^productId:\s*/i, '').trim();
        ctx.logger.info(`Fetching product specs for: ${productId}`);
        const specs = await this.productDocService.getSpecs(productId);
        if (!specs) {
            return { error: `No datasheet found for product ${productId}.` };
        }
        return specs;
    }

    @Tool({
        name: 'create_product_spec',
        title: 'Create Product Spec',
        description: 'Registers a new product with its datasheet, operating limits, and compliance certifications. Use this when the user wants to add a new product, register a new IP block, or create a product specification entry.',
        inputSchema: z.object({
            productId: z.string().describe('Product identifier, e.g. SERDES-PHY-BLOCK'),
            lotId: z.string().describe('The lot ID associated with this product, e.g. LOT-8923'),
            datasheetUrl: z.string().describe('URL to the product datasheet'),
            operatingVoltage: z.string().describe('Operating voltage with tolerance, e.g. 1.2V A 5%'),
            maxThermalThreshold: z.string().describe('Maximum thermal threshold, e.g. 105 C'),
            complianceCertifications: z.array(z.string()).describe('List of compliance certifications, e.g. ["RoHS Compliant", "REACH Certified"]'),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
        },
        invocation: {
            invoking: 'Creating product spec...',
            invoked: 'Product spec created',
        },
    })
    async createProductSpec(
        input: { productId: string; lotId: string; datasheetUrl: string; operatingVoltage: string; maxThermalThreshold: string; complianceCertifications: string[] },
        ctx: ExecutionContext,
    ) {
        const productId = String(input.productId).replace(/^productId:\s*/i, '').trim();
        const lotId = String(input.lotId).replace(/^lotId:\s*/i, '').trim();
        const datasheetUrl = String(input.datasheetUrl).replace(/^datasheetUrl:\s*/i, '').trim();
        const operatingVoltage = String(input.operatingVoltage).replace(/^operatingVoltage:\s*/i, '').trim();
        const maxThermalThreshold = String(input.maxThermalThreshold).replace(/^maxThermalThreshold:\s*/i, '').trim();

        // Format certifications as semicolon-separated text
        const certsText = (input.complianceCertifications || []).join('; ');

        ctx.logger.info(`Creating product spec: ${productId}`);

        await this.sheets.appendRow('Product Specs', [
            productId,
            lotId,
            datasheetUrl,
            operatingVoltage,
            maxThermalThreshold,
            certsText,
        ]);

        return {
            productId,
            lotId,
            datasheetUrl,
            operatingVoltage,
            maxThermalThreshold,
            complianceCertifications: input.complianceCertifications,
            message: `Product spec for ${productId} created successfully.`,
        };
    }
}
