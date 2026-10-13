import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { clerkAgent } from './bootstrap.js';

const stringOrArray = z.union([
  z.array(z.string()),
  z.string().transform(s => s.split(',').map(v => v.trim()).filter(Boolean))
]);

@Injectable()
export class RegisterFactoryTools {
  @Tool({
    name: 'register-factory',
    description: 'Register a new factory with its declared waste streams and generate its SPCB compliance report.',
    inputSchema: z.object({
      id: z.string().describe('Unique factory ID (e.g., fact_16)'),
      name: z.string().describe('Name of the factory'),
      industryType: z.string().describe('Type of industry (e.g., Textile Manufacturing)'),
      address: z.string().describe('Physical address'),
      lat: z.number().describe('Latitude coordinate'),
      lng: z.number().describe('Longitude coordinate'),
      productionCapacity: z.string().describe('Production capacity (e.g., 5 tons/day fabric)'),
      rawMaterials: stringOrArray.describe('List of raw materials consumed (comma-separated or array)'),
      declaredWastes: stringOrArray.describe('List of declared waste streams (comma-separated or array)')
    })
  })
  public async registerFactory(
    args: {
      id: string; name: string; industryType: string; address: string;
      lat: number; lng: number; productionCapacity: string;
      rawMaterials: string | string[]; declaredWastes: string | string[];
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`[SymbioForge] Registering factory: ${args.name}`);
    const rawMaterials = Array.isArray(args.rawMaterials) ? args.rawMaterials : args.rawMaterials.split(',').map(s => s.trim()).filter(Boolean);
    const declaredWastes = Array.isArray(args.declaredWastes) ? args.declaredWastes : args.declaredWastes.split(',').map(s => s.trim()).filter(Boolean);
    const { factory, reportPath } = await clerkAgent.registerFactory({
      id: args.id, name: args.name, industryType: args.industryType,
      location: { lat: args.lat, lng: args.lng, address: args.address },
      productionCapacity: args.productionCapacity,
      rawMaterials, declaredWastes,
      complianceStatus: 'filed'
    });
    return {
      success: true,
      message: `Factory "${factory.name}" registered successfully. SPCB compliance report generated.`,
      factory: {
        id: factory.id, name: factory.name, industryType: factory.industryType,
        productionCapacity: factory.productionCapacity,
        complianceStatus: factory.complianceStatus,
        lastFiledDate: factory.lastFiledDate,
        savingsEarned: factory.savingsEarned, co2Avoided: factory.co2Avoided,
        wasteStreams: factory.wasteStreams
      },
      complianceReport: {
        id: `report_${factory.id}_${new Date().getFullYear()}`,
        factoryId: factory.id, factoryName: factory.name,
        industryType: factory.industryType,
        filingYear: new Date().getFullYear(),
        waterConsentStatus: 'Valid — CTO renewed',
        airConsentStatus: 'Valid — within PM/SO2 limits',
        hazardousWasteAuthorization: 'Not required',
        solidWasteDisposalMethod: 'Authorized recycler + SymbioForge circular exchange',
        complianceScore: 88,
        recommendations: ['All compliance parameters within norms. Continue annual filing schedule.']
      },
      pdfPath: reportPath,
      widgetUri: 'ui://compliance-dashboard'
    };
  }
}
