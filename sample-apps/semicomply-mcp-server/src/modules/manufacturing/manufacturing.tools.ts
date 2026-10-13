import { Injectable, ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';
import { ManufacturingMESService } from './manufacturing.service.js';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service.js';

@Injectable({ deps: [ManufacturingMESService, GoogleSheetsService] })
export class ManufacturingMESTools {
    constructor(
        private readonly manufacturingMESService: ManufacturingMESService,
        private readonly sheets: GoogleSheetsService,
    ) { }

    @Tool({
        name: 'get_manufacturing_mes_telemetry',
        title: 'Manufacturing MES Telemetry',
        description: 'Fetches machine-level process telemetry (chamber pressure, temperature, recipe, operator) for a given wafer lot from GE Vernova/Siemens MES. Automatically flags threshold excursions.',
        inputSchema: z.object({
            lotId: z.string().describe('The semiconductor lot ID, e.g. LOT-8923'),
        }),
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
        },
    })
    async getTelemetry(input: { lotId: string }, ctx: ExecutionContext) {
        const lotId = String(input.lotId).replace(/^lotId:\s*/i, '').trim();
        ctx.logger.info(`Fetching MES telemetry for lot: ${lotId}`);
        const telemetry = await this.manufacturingMESService.getTelemetry(lotId);
        if (!telemetry) {
            return { error: `Lot ${lotId} not found in MES database.` };
        }
        return telemetry;
    }

    @Tool({
        name: 'create_manufacturing_step',
        title: 'Create Manufacturing Step',
        description: 'Logs a new manufacturing process step (etch, CVD, litho, etc.) for a wafer lot. Use this when the user wants to record a factory operation, add a process step, or log telemetry from a fab station.',
        inputSchema: z.object({
            lotId: z.string().describe('The lot ID being processed, e.g. LOT-8923'),
            stationId: z.string().describe('The fab station identifier, e.g. FAB-HSINCHU-ETCH-07'),
            recipeName: z.string().describe('The process recipe name, e.g. POLY_SILICON_ETCH_V3'),
            chamberPressure: z.string().describe('Chamber pressure reading, e.g. 14.2 mTorr (Exceeded threshold of 12.0 mTorr)'),
            temperature: z.string().describe('Temperature reading, e.g. 185.4 C'),
            operatorId: z.string().describe('Operator ID, e.g. OP-4492'),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
        },
        invocation: {
            invoking: 'Creating manufacturing step...',
            invoked: 'Manufacturing step created',
        },
    })
    async createStep(
        input: { lotId: string; stationId: string; recipeName: string; chamberPressure: string; temperature: string; operatorId: string },
        ctx: ExecutionContext,
    ) {
        const lotId = String(input.lotId).replace(/^lotId:\s*/i, '').trim();
        const stationId = String(input.stationId).replace(/^stationId:\s*/i, '').trim();
        const recipeName = String(input.recipeName).replace(/^recipeName:\s*/i, '').trim();
        const chamberPressure = String(input.chamberPressure).replace(/^chamberPressure:\s*/i, '').trim();
        const temperature = String(input.temperature).replace(/^temperature:\s*/i, '').trim();
        const operatorId = String(input.operatorId).replace(/^operatorId:\s*/i, '').trim();

        ctx.logger.info(`Creating manufacturing step: ${stationId} for lot ${lotId}`);

        await this.sheets.appendRow('MES Telemetry', [
            lotId,
            stationId,
            recipeName,
            chamberPressure,
            temperature,
            operatorId,
        ]);

        return {
            lotId,
            stationId,
            recipeName,
            chamberPressure,
            temperature,
            operatorId,
            message: `Manufacturing step ${stationId} for lot ${lotId} logged successfully.`,
        };
    }
}
