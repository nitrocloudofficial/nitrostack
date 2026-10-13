import { readFileSync } from 'fs';
import { join } from 'path';
import { Factory, SymbioticMatch, ProductConcept, ClusterState } from './types.js';

export class ImpactCalculator {
  private emissionFactors: any;

  constructor() {
    try {
      const factorsPath = join(process.cwd(), 'src/data/emission-factors.json');
      const data = JSON.parse(readFileSync(factorsPath, 'utf-8'));
      this.emissionFactors = data.emissionFactors || {};
    } catch (e) {
      this.emissionFactors = {};
    }
  }

  public calculateClusterMetrics(
    factories: Factory[],
    matches: SymbioticMatch[],
    products: ProductConcept[]
  ): Pick<ClusterState, 'circularScore' | 'totalCo2Avoided' | 'totalLandfillDiverted' | 'totalWaterSaved' | 'totalEnergySaved' | 'totalFinancialValue'> {
    // Filter active or blueprint ready opportunities
    const activeMatches = matches.filter(m => m.status === 'Active' || m.status === 'Blueprint Ready');
    const activeProducts = products.filter(p => p.status === 'Active' || p.status === 'Blueprint Ready');

    let totalCo2Avoided = 0;
    let totalLandfillDiverted = 0;
    let totalWaterSaved = 0;
    let totalEnergySaved = 0;
    let totalFinancialValue = 0;

    // Calculate from matches
    for (const m of activeMatches) {
      totalCo2Avoided += m.co2SavedTonsPerYear;
      totalLandfillDiverted += m.volumeTonsPerYear;
      totalFinancialValue += m.savingsInrPerYear;

      // Water saved calculation
      const waterFactor = this.emissionFactors.waterSavedPerKg?.[m.wasteStreamName] || 10;
      totalWaterSaved += m.volumeTonsPerYear * 1000 * waterFactor;

      // Energy saved calculation
      const energyFactor = this.emissionFactors.energySavedKwhPerKg?.[m.wasteStreamName] || 2;
      totalEnergySaved += m.volumeTonsPerYear * 1000 * energyFactor;
    }

    // Calculate from products
    for (const p of activeProducts) {
      totalCo2Avoided += p.co2SavedTonsPerYear;
      // Landfill diverted is the sum of waste streams used
      const productVolumeTons = p.co2SavedTonsPerYear / 1.5; // Inverse of 1.5 factor
      totalLandfillDiverted += productVolumeTons;
      totalFinancialValue += p.revenuePotentialInrPerYear;

      // Water and energy saved calculation
      for (const w of p.wasteStreamsUsed) {
        const perStreamTons = productVolumeTons / p.wasteStreamsUsed.length;
        const waterFactor = this.emissionFactors.waterSavedPerKg?.[w.wasteStreamName] || 10;
        totalWaterSaved += perStreamTons * 1000 * waterFactor;
        const energyFactor = this.emissionFactors.energySavedKwhPerKg?.[w.wasteStreamName] || 2;
        totalEnergySaved += perStreamTons * 1000 * energyFactor;
      }
    }

    // Calculate circular score: percentage of waste streams that are active in matches or products
    const totalWasteStreams = factories.reduce((acc, f) => acc + (f.wasteStreams?.length || 0), 0);
    const activeWasteStreamIds = new Set<string>();

    for (const m of activeMatches) {
      activeWasteStreamIds.add(m.wasteStreamId);
    }
    for (const p of activeProducts) {
      for (const w of p.wasteStreamsUsed) {
        activeWasteStreamIds.add(w.wasteStreamId);
      }
    }

    const circularScore = totalWasteStreams > 0 ? Math.round((activeWasteStreamIds.size / totalWasteStreams) * 100) : 0;

    return {
      circularScore,
      totalCo2Avoided: parseFloat(totalCo2Avoided.toFixed(2)),
      totalLandfillDiverted: parseFloat(totalLandfillDiverted.toFixed(2)),
      totalWaterSaved: Math.round(totalWaterSaved),
      totalEnergySaved: Math.round(totalEnergySaved),
      totalFinancialValue
    };
  }
}
