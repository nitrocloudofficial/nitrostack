import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { stateManager, clerkAgent, _sentinel } from './bootstrap.js';

@Injectable()
export class ComplianceTools {
  @Tool({
    name: 'get-compliance-report',
    description: 'Retrieve the SPCB Annual Environmental Statement report for a specific factory.',
    inputSchema: z.object({
      factoryId: z.string().describe('The ID of the factory')
    })
  })
  @Widget('compliance-dashboard')
  public async getComplianceReport(args: { factoryId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`[SymbioForge] Retrieving compliance report for: ${args.factoryId}`);
    const factory = stateManager.getFactory(args.factoryId);
    if (!factory) {
      return { success: false, message: `Factory with ID "${args.factoryId}" not found.` };
    }
    const pdfPath = await clerkAgent.generateComplianceReport(args.factoryId);
    const totalVolume = (factory.wasteStreams ?? []).reduce((s, w) => s + w.volume, 0);
    const hasHazardous = (factory.wasteStreams ?? []).some(w => w.contamination === 'hazardous');
    const complianceScore = factory.complianceStatus === 'filed' ? 88 : factory.complianceStatus === 'pending' ? 62 : 35;
    const recommendations: string[] = [];
    if (hasHazardous) recommendations.push('Obtain TSDF authorization for hazardous waste streams under HWM Rules 2016.');
    if (totalVolume > 500) recommendations.push('Install continuous effluent monitoring system (CEMS) as per CPCB mandate.');
    if (factory.co2Avoided < 5) recommendations.push('Increase participation in industrial symbiosis to improve circular economy score.');
    if (factory.complianceStatus !== 'filed') recommendations.push('File SPCB Form V Annual Environmental Statement immediately to avoid penalties.');
    if (recommendations.length === 0) recommendations.push('All compliance parameters within norms. Continue annual filing schedule.');

    return {
      success: true,
      factory: {
        id: factory.id,
        name: factory.name,
        industryType: factory.industryType,
        productionCapacity: factory.productionCapacity,
        complianceStatus: factory.complianceStatus,
        lastFiledDate: factory.lastFiledDate,
        savingsEarned: factory.savingsEarned,
        co2Avoided: factory.co2Avoided,
        wasteStreams: factory.wasteStreams
      },
      complianceReport: {
        id: `report_${factory.id}_${new Date().getFullYear()}`,
        factoryId: factory.id,
        factoryName: factory.name,
        industryType: factory.industryType,
        filingYear: new Date().getFullYear(),
        waterConsentStatus: 'Valid — CTO renewed',
        airConsentStatus: 'Valid — within PM/SO2 limits',
        hazardousWasteAuthorization: hasHazardous ? 'Required — pending TSDF linkage' : 'Not required',
        solidWasteDisposalMethod: 'Authorized recycler + SymbioForge circular exchange',
        complianceScore,
        recommendations
      },
      pdfPath,
      widgetUri: 'ui://compliance-dashboard'
    };
  }

  @Tool({
    name: 'trigger-compliance-check',
    description: 'Forces Sentinel to run its periodic compliance deadline check.',
    inputSchema: z.object({})
  })
  public async triggerComplianceCheck(args: {}, ctx: ExecutionContext) {
    ctx.logger.info(`[SymbioForge] Running periodic compliance check...`);
    _sentinel.checkComplianceDeadlines();
    return { success: true, message: 'Compliance check initiated across cluster.' };
  }
}
