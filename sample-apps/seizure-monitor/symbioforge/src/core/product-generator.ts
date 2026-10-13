import { readFileSync } from 'fs';
import { join } from 'path';
import { Factory, WasteStream, ProductConcept } from './types.js';

export interface MarketProduct {
  name: string;
  description: string;
  wasteStreams: string[];
  manufacturingProcess: string;
  productionCostPerUnit: number;
  marketPricePerUnit: number;
  targetMarket: string;
  unit: string;
}

export class ProductGenerator {
  private marketProducts: MarketProduct[] = [];

  constructor() {
    try {
      const marketPath = join(process.cwd(), 'src/data/market-data.json');
      const data = JSON.parse(readFileSync(marketPath, 'utf-8'));
      this.marketProducts = data.products || [];
    } catch (e) {
      this.marketProducts = [];
    }
  }

  public generateProducts(factories: Factory[]): ProductConcept[] {
    const concepts: ProductConcept[] = [];
    const allWastes: WasteStream[] = [];

    for (const f of factories) {
      if (f.wasteStreams) {
        allWastes.push(...f.wasteStreams);
      }
    }

    for (const mp of this.marketProducts) {
      // Check if we have all required waste streams in the cluster
      const matchingWastes = mp.wasteStreams.map(reqWaste => {
        return allWastes.filter(w => w.name.toLowerCase() === reqWaste.toLowerCase());
      });

      // If any required waste stream is completely missing, we can't make the product
      if (matchingWastes.some(list => list.length === 0)) continue;

      // Generate combinations of factories that can supply these wastes
      // For simplicity, we'll take the highest volume suppliers for each required waste
      const suppliers = mp.wasteStreams.map((reqWaste, idx) => {
        const list = matchingWastes[idx];
        // Sort by volume descending
        list.sort((a, b) => b.volume - a.volume);
        return list[0]; // Best supplier
      });

      // Calculate total volume available (limited by the bottleneck waste stream)
      const volumes = suppliers.map(s => s.volume);
      const bottleneckVolume = Math.min(...volumes);

      // Calculate total tons per year (assuming 300 operating days)
      const volumeTonsPerYear = parseFloat(((bottleneckVolume * 300) / 1000).toFixed(2));

      // Calculate CO2 saved: 1.5 tons CO2 saved per ton of product
      const co2SavedTonsPerYear = parseFloat((volumeTonsPerYear * 1.5).toFixed(2));

      // Calculate revenue potential: (market price - production cost) * units produced
      // Let's assume 1 ton of waste produces 1000 units of product
      const unitsProduced = volumeTonsPerYear * 1000;
      const profitPerUnit = mp.marketPricePerUnit - mp.productionCostPerUnit;
      const revenuePotentialInrPerYear = Math.round(unitsProduced * profitPerUnit);

      // Feasibility score based on supplier proximity and waste contamination
      const avgContamination = suppliers.reduce((acc, s) => {
        if (s.contamination === 'clean') return acc + 100;
        if (s.contamination === 'mild') return acc + 80;
        if (s.contamination === 'high') return acc + 50;
        return acc + 20;
      }, 0) / suppliers.length;

      const feasibilityScore = Math.round(avgContamination * 0.8 + 15); // Max 95

      concepts.push({
        id: `prod_${mp.name.toLowerCase().replace(/\s+/g, '_')}`,
        name: mp.name,
        description: mp.description,
        wasteStreamsUsed: suppliers.map(s => ({
          wasteStreamId: s.id,
          wasteStreamName: s.name,
          factoryId: s.factoryId,
          factoryName: s.factoryName,
          proportion: Math.round(100 / suppliers.length)
        })),
        manufacturingProcess: mp.manufacturingProcess,
        feasibilityScore,
        productionCostPerUnit: mp.productionCostPerUnit,
        marketPricePerUnit: mp.marketPricePerUnit,
        targetMarket: mp.targetMarket,
        co2SavedTonsPerYear,
        revenuePotentialInrPerYear,
        status: 'New'
      });
    }

    return concepts;
  }
}
