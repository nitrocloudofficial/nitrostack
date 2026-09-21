import { readFileSync } from 'fs';
import { join } from 'path';
import { WasteStream } from './types.js';

// ---------------------------------------------------------------------------
// Industry-type → inferred waste streams (when factory doesn't declare them)
// Based on CPCB sector classifications and industrial ecology research.
// ---------------------------------------------------------------------------
const INDUSTRY_WASTE_MAP: Record<string, Array<{
  name: string;
  category: WasteStream['category'];
  physicalForm: WasteStream['physicalForm'];
  volume: number;
  contamination: WasteStream['contamination'];
  seasonalVariation: WasteStream['seasonalVariation'];
  reusePotential: number;
}>> = {
  'Textile Manufacturing': [
    { name: 'Cotton lint', category: 'textile', physicalForm: 'fiber', volume: 65, contamination: 'clean', seasonalVariation: 'none', reusePotential: 88 },
    { name: 'Polyester scraps', category: 'polymeric', physicalForm: 'fiber', volume: 40, contamination: 'clean', seasonalVariation: 'none', reusePotential: 82 },
    { name: 'Dye effluent', category: 'chemical', physicalForm: 'liquid', volume: 200, contamination: 'high', seasonalVariation: 'none', reusePotential: 35 },
    { name: 'Cardboard packaging', category: 'cellulosic', physicalForm: 'solid', volume: 20, contamination: 'clean', seasonalVariation: 'none', reusePotential: 95 },
  ],
  'Food Processing': [
    { name: 'Rice husk', category: 'organic', physicalForm: 'powder', volume: 150, contamination: 'clean', seasonalVariation: 'summer_peak', reusePotential: 90 },
    { name: 'Bran', category: 'organic', physicalForm: 'powder', volume: 80, contamination: 'clean', seasonalVariation: 'none', reusePotential: 85 },
    { name: 'Spent grain', category: 'organic', physicalForm: 'solid', volume: 350, contamination: 'clean', seasonalVariation: 'none', reusePotential: 92 },
    { name: 'Wastewater', category: 'chemical', physicalForm: 'liquid', volume: 1000, contamination: 'high', seasonalVariation: 'none', reusePotential: 40 },
  ],
  'Metal Fabrication': [
    { name: 'Aluminum shavings', category: 'metallic', physicalForm: 'powder', volume: 85, contamination: 'clean', seasonalVariation: 'none', reusePotential: 94 },
    { name: 'Steel scrap', category: 'metallic', physicalForm: 'solid', volume: 150, contamination: 'clean', seasonalVariation: 'none', reusePotential: 96 },
    { name: 'Spent cutting oil', category: 'chemical', physicalForm: 'liquid', volume: 40, contamination: 'hazardous', seasonalVariation: 'none', reusePotential: 30 },
    { name: 'Foundry sand', category: 'metallic', physicalForm: 'powder', volume: 400, contamination: 'mild', seasonalVariation: 'none', reusePotential: 78 },
  ],
  'Chemical Manufacturing': [
    { name: 'Spent solvent', category: 'chemical', physicalForm: 'liquid', volume: 50, contamination: 'hazardous', seasonalVariation: 'none', reusePotential: 40 },
    { name: 'Filter cake', category: 'chemical', physicalForm: 'solid', volume: 30, contamination: 'hazardous', seasonalVariation: 'none', reusePotential: 15 },
    { name: 'Chemical wash water', category: 'chemical', physicalForm: 'liquid', volume: 300, contamination: 'high', seasonalVariation: 'none', reusePotential: 35 },
    { name: 'Cardboard packaging', category: 'cellulosic', physicalForm: 'solid', volume: 25, contamination: 'clean', seasonalVariation: 'none', reusePotential: 90 },
  ],
  'Plastics Manufacturing': [
    { name: 'PE film scraps', category: 'polymeric', physicalForm: 'film', volume: 75, contamination: 'clean', seasonalVariation: 'none', reusePotential: 85 },
    { name: 'PP purgings', category: 'polymeric', physicalForm: 'solid', volume: 45, contamination: 'clean', seasonalVariation: 'none', reusePotential: 80 },
    { name: 'Defective molded parts', category: 'polymeric', physicalForm: 'solid', volume: 30, contamination: 'clean', seasonalVariation: 'none', reusePotential: 90 },
    { name: 'Plastic wash water', category: 'chemical', physicalForm: 'liquid', volume: 500, contamination: 'high', seasonalVariation: 'none', reusePotential: 45 },
  ],
  'Paper & Pulp': [
    { name: 'Paper trimmings', category: 'cellulosic', physicalForm: 'solid', volume: 100, contamination: 'clean', seasonalVariation: 'none', reusePotential: 92 },
    { name: 'Paper sludge', category: 'cellulosic', physicalForm: 'solid', volume: 300, contamination: 'high', seasonalVariation: 'none', reusePotential: 50 },
    { name: 'Boiler ash', category: 'metallic', physicalForm: 'powder', volume: 120, contamination: 'high', seasonalVariation: 'none', reusePotential: 60 },
    { name: 'Wastewater', category: 'chemical', physicalForm: 'liquid', volume: 800, contamination: 'high', seasonalVariation: 'none', reusePotential: 40 },
  ],
  'Leather & Tannery': [
    { name: 'Chrome shavings', category: 'chemical', physicalForm: 'solid', volume: 80, contamination: 'hazardous', seasonalVariation: 'none', reusePotential: 25 },
    { name: 'Fleshing waste', category: 'organic', physicalForm: 'solid', volume: 120, contamination: 'high', seasonalVariation: 'none', reusePotential: 40 },
    { name: 'Tannery effluent', category: 'chemical', physicalForm: 'liquid', volume: 1500, contamination: 'hazardous', seasonalVariation: 'none', reusePotential: 15 },
  ],
  'Construction Materials': [
    { name: 'Concrete wash water', category: 'chemical', physicalForm: 'liquid', volume: 200, contamination: 'mild', seasonalVariation: 'none', reusePotential: 50 },
    { name: 'Broken block scrap', category: 'metallic', physicalForm: 'solid', volume: 120, contamination: 'clean', seasonalVariation: 'none', reusePotential: 85 },
    { name: 'Dust emissions', category: 'metallic', physicalForm: 'powder', volume: 15, contamination: 'mild', seasonalVariation: 'none', reusePotential: 10 },
  ],
  'Brewing & Distillery': [
    { name: 'Spent grain', category: 'organic', physicalForm: 'solid', volume: 350, contamination: 'clean', seasonalVariation: 'none', reusePotential: 92 },
    { name: 'Yeast sludge', category: 'organic', physicalForm: 'liquid', volume: 60, contamination: 'clean', seasonalVariation: 'none', reusePotential: 80 },
    { name: 'Wastewater', category: 'chemical', physicalForm: 'liquid', volume: 700, contamination: 'high', seasonalVariation: 'none', reusePotential: 40 },
  ],
  'Furniture & Wood': [
    { name: 'Board trimmings', category: 'cellulosic', physicalForm: 'solid', volume: 80, contamination: 'clean', seasonalVariation: 'none', reusePotential: 90 },
    { name: 'Adhesive waste', category: 'chemical', physicalForm: 'liquid', volume: 10, contamination: 'high', seasonalVariation: 'none', reusePotential: 15 },
    { name: 'Insulation trimmings', category: 'polymeric', physicalForm: 'fiber', volume: 50, contamination: 'clean', seasonalVariation: 'none', reusePotential: 80 },
  ],
};

// Keyword fuzzy-match: maps partial industry name tokens → canonical key
const INDUSTRY_KEYWORD_MAP: Array<[string, string]> = [
  ['textile', 'Textile Manufacturing'],
  ['garment', 'Textile Manufacturing'],
  ['weaving', 'Textile Manufacturing'],
  ['spinning', 'Textile Manufacturing'],
  ['fabric', 'Textile Manufacturing'],
  ['food', 'Food Processing'],
  ['rice', 'Food Processing'],
  ['grain', 'Food Processing'],
  ['flour', 'Food Processing'],
  ['agro', 'Food Processing'],
  ['metal', 'Metal Fabrication'],
  ['steel', 'Metal Fabrication'],
  ['alumin', 'Metal Fabrication'],
  ['foundry', 'Metal Fabrication'],
  ['engineering', 'Metal Fabrication'],
  ['fabricat', 'Metal Fabrication'],
  ['chemic', 'Chemical Manufacturing'],
  ['pharma', 'Chemical Manufacturing'],
  ['plastic', 'Plastics Manufacturing'],
  ['polymer', 'Plastics Manufacturing'],
  ['recycl', 'Plastics Manufacturing'],
  ['paper', 'Paper & Pulp'],
  ['pulp', 'Paper & Pulp'],
  ['leather', 'Leather & Tannery'],
  ['tannery', 'Leather & Tannery'],
  ['construct', 'Construction Materials'],
  ['concrete', 'Construction Materials'],
  ['brick', 'Construction Materials'],
  ['brew', 'Brewing & Distillery'],
  ['distill', 'Brewing & Distillery'],
  ['beverage', 'Brewing & Distillery'],
  ['furniture', 'Furniture & Wood'],
  ['wood', 'Furniture & Wood'],
];

// Category keyword inference for unknown waste names
const WASTE_KEYWORD_INFERENCE: Array<[string, Partial<WasteStream>]> = [
  ['cotton', { category: 'textile', physicalForm: 'fiber', contamination: 'clean', reusePotential: 80 }],
  ['polyester', { category: 'polymeric', physicalForm: 'fiber', contamination: 'clean', reusePotential: 75 }],
  ['nylon', { category: 'polymeric', physicalForm: 'fiber', contamination: 'clean', reusePotential: 70 }],
  ['dye', { category: 'chemical', physicalForm: 'liquid', contamination: 'high', reusePotential: 30 }],
  ['effluent', { category: 'chemical', physicalForm: 'liquid', contamination: 'high', reusePotential: 35 }],
  ['wastewater', { category: 'chemical', physicalForm: 'liquid', contamination: 'high', reusePotential: 40 }],
  ['ash', { category: 'metallic', physicalForm: 'powder', contamination: 'high', reusePotential: 60 }],
  ['slag', { category: 'metallic', physicalForm: 'solid', contamination: 'high', reusePotential: 65 }],
  ['scrap', { category: 'metallic', physicalForm: 'solid', contamination: 'clean', reusePotential: 85 }],
  ['shaving', { category: 'metallic', physicalForm: 'powder', contamination: 'clean', reusePotential: 90 }],
  ['chip', { category: 'metallic', physicalForm: 'solid', contamination: 'mild', reusePotential: 82 }],
  ['plastic', { category: 'polymeric', physicalForm: 'solid', contamination: 'clean', reusePotential: 78 }],
  ['film', { category: 'polymeric', physicalForm: 'film', contamination: 'clean', reusePotential: 82 }],
  ['pellet', { category: 'polymeric', physicalForm: 'pellets', contamination: 'clean', reusePotential: 90 }],
  ['husk', { category: 'organic', physicalForm: 'powder', contamination: 'clean', reusePotential: 88 }],
  ['bran', { category: 'organic', physicalForm: 'powder', contamination: 'clean', reusePotential: 85 }],
  ['bagasse', { category: 'organic', physicalForm: 'solid', contamination: 'clean', reusePotential: 92 }],
  ['grain', { category: 'organic', physicalForm: 'solid', contamination: 'clean', reusePotential: 90 }],
  ['paper', { category: 'cellulosic', physicalForm: 'solid', contamination: 'clean', reusePotential: 92 }],
  ['cardboard', { category: 'cellulosic', physicalForm: 'solid', contamination: 'clean', reusePotential: 95 }],
  ['sludge', { category: 'organic', physicalForm: 'solid', contamination: 'high', reusePotential: 45 }],
  ['oil', { category: 'chemical', physicalForm: 'liquid', contamination: 'hazardous', reusePotential: 35 }],
  ['solvent', { category: 'chemical', physicalForm: 'liquid', contamination: 'hazardous', reusePotential: 40 }],
  ['dust', { category: 'metallic', physicalForm: 'powder', contamination: 'mild', reusePotential: 50 }],
  ['trimming', { category: 'cellulosic', physicalForm: 'solid', contamination: 'clean', reusePotential: 88 }],
  ['packaging', { category: 'cellulosic', physicalForm: 'solid', contamination: 'clean', reusePotential: 90 }],
];

export class WasteClassifier {
  private materialsDb: Record<string, any>;

  constructor() {
    try {
      const dbPath = join(process.cwd(), 'src/data/materials-db.json');
      this.materialsDb = JSON.parse(readFileSync(dbPath, 'utf-8'));
    } catch (e) {
      this.materialsDb = {};
    }
  }

  /**
   * Classify a declared waste stream by name. Uses:
   * 1. Exact match in materials-db.json
   * 2. Case-insensitive partial match in materials-db.json
   * 3. Keyword-based inference from the waste name
   */
  public classifyWaste(factoryId: string, factoryName: string, wasteName: string): WasteStream {
    const id = `${factoryId}_${wasteName.toLowerCase().replace(/\s+/g, '_')}`;

    // 1. Exact match
    const exact = this.materialsDb[wasteName];
    if (exact) {
      return this.buildStream(id, factoryId, factoryName, wasteName, exact);
    }

    // 2. Case-insensitive partial match
    const lowerWaste = wasteName.toLowerCase();
    const partialKey = Object.keys(this.materialsDb).find(k => k.toLowerCase() === lowerWaste);
    if (partialKey) {
      return this.buildStream(id, factoryId, factoryName, wasteName, this.materialsDb[partialKey]);
    }

    // 3. Keyword inference from waste name
    for (const [keyword, defaults] of WASTE_KEYWORD_INFERENCE) {
      if (lowerWaste.includes(keyword)) {
        return {
          id,
          factoryId,
          factoryName,
          name: wasteName,
          category: defaults.category ?? 'organic',
          physicalForm: defaults.physicalForm ?? 'solid',
          volume: 60,
          contamination: defaults.contamination ?? 'mild',
          seasonalVariation: 'none',
          reusePotential: defaults.reusePotential ?? 55
        };
      }
    }

    // 4. Generic fallback with conservative estimates
    return {
      id,
      factoryId,
      factoryName,
      name: wasteName,
      category: 'organic',
      physicalForm: 'solid',
      volume: 50,
      contamination: 'mild',
      seasonalVariation: 'none',
      reusePotential: 50
    };
  }

  /**
   * Infer likely waste streams from the factory's industry type and raw materials,
   * even when the factory has NOT explicitly declared them.
   * This is the Profiler's deep inference capability from the blueprint.
   */
  public inferWastesFromIndustry(
    factoryId: string,
    factoryName: string,
    industryType: string,
    rawMaterials: string[]
  ): WasteStream[] {
    const streams: WasteStream[] = [];
    const seen = new Set<string>();

    // Find matching industry key via keyword fuzzy match
    const lowerIndustry = industryType.toLowerCase();
    let industryKey: string | null = null;
    for (const [keyword, key] of INDUSTRY_KEYWORD_MAP) {
      if (lowerIndustry.includes(keyword)) {
        industryKey = key;
        break;
      }
    }

    if (industryKey && INDUSTRY_WASTE_MAP[industryKey]) {
      for (const w of INDUSTRY_WASTE_MAP[industryKey]) {
        if (!seen.has(w.name)) {
          seen.add(w.name);
          streams.push({
            id: `${factoryId}_${w.name.toLowerCase().replace(/\s+/g, '_')}_inferred`,
            factoryId,
            factoryName,
            name: w.name,
            category: w.category,
            physicalForm: w.physicalForm,
            volume: w.volume,
            contamination: w.contamination,
            seasonalVariation: w.seasonalVariation,
            reusePotential: w.reusePotential
          });
        }
      }
    }

    // Also infer from raw materials if they hint at specific wastes
    for (const material of rawMaterials) {
      const lm = material.toLowerCase();
      for (const [keyword, defaults] of WASTE_KEYWORD_INFERENCE) {
        const inferredName = `${material} residue`;
        if (lm.includes(keyword) && !seen.has(inferredName)) {
          seen.add(inferredName);
          streams.push({
            id: `${factoryId}_${inferredName.toLowerCase().replace(/\s+/g, '_')}_inferred`,
            factoryId,
            factoryName,
            name: inferredName,
            category: defaults.category ?? 'organic',
            physicalForm: defaults.physicalForm ?? 'solid',
            volume: 30,
            contamination: defaults.contamination ?? 'mild',
            seasonalVariation: 'none',
            reusePotential: defaults.reusePotential ?? 55
          });
          break;
        }
      }
    }

    return streams;
  }

  private buildStream(
    id: string,
    factoryId: string,
    factoryName: string,
    name: string,
    data: any
  ): WasteStream {
    return {
      id,
      factoryId,
      factoryName,
      name,
      category: data.category,
      physicalForm: data.physicalForm,
      volume: data.volumeEstimate ?? data.volume ?? 50,
      contamination: data.contamination,
      seasonalVariation: data.seasonalVariation,
      reusePotential: data.reusePotential
    };
  }
}
