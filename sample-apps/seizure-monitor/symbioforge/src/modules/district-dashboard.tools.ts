import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { StateManager } from '../orchestrator/state-manager.js';

const stateManager = StateManager.getInstance();

@Injectable()
export class DistrictDashboardTools {

  @Tool({
    name: 'get-district-overview',
    description: 'Retrieve a District Environmental Officer view of the industrial cluster: compliance rates, deadline alerts, risk heatmap, landfill diversion progress, carbon credits, and industry breakdown.',
    inputSchema: z.object({})
  })
  @Widget('district-dashboard')
  public async getDistrictOverview(args: any, ctx: ExecutionContext) {
    ctx.logger.info('[SymbioForge] Generating District Officer Overview');
    const state = stateManager.getState();
    const now = new Date();

    // ── Compliance Summary ──────────────────────────────────────────
    const filed = state.factories.filter(f => f.complianceStatus === 'filed').length;
    const pending = state.factories.filter(f => f.complianceStatus === 'pending').length;
    const overdue = state.factories.filter(f => f.complianceStatus === 'overdue').length;
    const totalFactories = state.factories.length;
    const complianceRate = totalFactories > 0 ? Math.round((filed / totalFactories) * 100) : 0;

    // ── Deadline Alerts ─────────────────────────────────────────────
    const deadlineAlerts = state.factories.map(f => {
      const lastFiled = f.lastFiledDate ? new Date(f.lastFiledDate) : new Date(now.getFullYear() - 1, 2, 31); // Default: last March 31
      const nextDeadline = new Date(lastFiled);
      nextDeadline.setFullYear(nextDeadline.getFullYear() + 1);
      const daysRemaining = Math.ceil((nextDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        factoryId: f.id,
        factoryName: f.name,
        industryType: f.industryType,
        lastFiled: lastFiled.toISOString().split('T')[0],
        nextDeadline: nextDeadline.toISOString().split('T')[0],
        daysRemaining,
        status: f.complianceStatus,
        urgent: daysRemaining <= 30
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);

    // ── Risk Heatmap ────────────────────────────────────────────────
    const riskMap = state.factories.map(f => {
      let riskScore = 0;
      let riskFactors: string[] = [];

      // Compliance risk
      if (f.complianceStatus === 'overdue') { riskScore += 40; riskFactors.push('Overdue filing'); }
      else if (f.complianceStatus === 'pending') { riskScore += 20; riskFactors.push('Pending filing'); }

      // Hazardous waste risk
      const hazardousStreams = (f.wasteStreams || []).filter(w => w.contamination === 'hazardous' || w.contamination === 'high');
      if (hazardousStreams.length > 0) { riskScore += 30; riskFactors.push(`${hazardousStreams.length} high-risk waste stream(s)`); }

      // Low reuse potential
      const lowReuse = (f.wasteStreams || []).filter(w => w.reusePotential < 30);
      if (lowReuse.length > 0) { riskScore += 15; riskFactors.push(`${lowReuse.length} low-reuse waste stream(s)`); }

      // No active symbioses
      const hasActiveMatch = state.matches.some(
        m => (m.sourceFactoryId === f.id || m.targetFactoryId === f.id) && (m.status === 'Active' || m.status === 'Blueprint Ready')
      );
      if (!hasActiveMatch) { riskScore += 15; riskFactors.push('No active symbioses'); }

      const riskLevel: 'green' | 'yellow' | 'red' = riskScore >= 50 ? 'red' : riskScore >= 25 ? 'yellow' : 'green';

      return {
        factoryId: f.id,
        factoryName: f.name,
        industryType: f.industryType,
        lat: f.location.lat,
        lng: f.location.lng,
        riskScore,
        riskLevel,
        riskFactors,
        complianceStatus: f.complianceStatus
      };
    });

    // ── District Targets ────────────────────────────────────────────
    const districtLandfillTarget = 500; // tons/year target for the district
    const diversionProgress = Math.min(100, Math.round((state.totalLandfillDiverted / districtLandfillTarget) * 100));

    // ── Carbon Credits ──────────────────────────────────────────────
    const carbonCredits = Math.round(state.totalCo2Avoided); // 1 credit = 1 ton CO2
    const carbonCreditValueInr = carbonCredits * 1500; // ~INR 1500 per credit in Indian market

    // ── Industry Breakdown ──────────────────────────────────────────
    const industryMap = new Map<string, { count: number; co2Avoided: number; savings: number }>();
    for (const f of state.factories) {
      const existing = industryMap.get(f.industryType) || { count: 0, co2Avoided: 0, savings: 0 };
      existing.count++;
      existing.co2Avoided += f.co2Avoided;
      existing.savings += f.savingsEarned;
      industryMap.set(f.industryType, existing);
    }
    const industryBreakdown = Array.from(industryMap.entries()).map(([type, data]) => ({
      industryType: type,
      factoryCount: data.count,
      co2Avoided: parseFloat(data.co2Avoided.toFixed(2)),
      savings: Math.round(data.savings)
    })).sort((a, b) => b.co2Avoided - a.co2Avoided);

    return {
      success: true,
      districtName: 'Sriperumbudur-Oragadam Industrial Corridor',
      state: 'Tamil Nadu',
      reportDate: now.toISOString().split('T')[0],
      compliance: {
        totalFactories,
        filed,
        pending,
        overdue,
        complianceRate
      },
      deadlineAlerts,
      riskMap,
      districtTargets: {
        landfillTargetTons: districtLandfillTarget,
        landfillDivertedTons: state.totalLandfillDiverted,
        diversionProgress
      },
      carbonCredits: {
        totalCredits: carbonCredits,
        estimatedValueInr: carbonCreditValueInr
      },
      clusterMetrics: {
        circularScore: state.circularScore,
        totalCo2Avoided: state.totalCo2Avoided,
        totalWaterSaved: state.totalWaterSaved,
        totalFinancialValue: state.totalFinancialValue
      },
      industryBreakdown,
      widgetUri: 'ui://district-dashboard'
    };
  }
}
