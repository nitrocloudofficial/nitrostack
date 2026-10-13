import factoriesInitialJson from '@/data/factories-initial.json';
import factoryFeedJson from '@/data/factory-feed.json';
import compatibilityMatrixJson from '@/data/compatibility-matrix.json';
import materialsDbJson from '@/data/materials-db.json';
import marketDataJson from '@/data/market-data.json';
import manufacturingProcessesJson from '@/data/manufacturing-processes.json';
import emissionFactorsJson from '@/data/emission-factors.json';

export interface RawFactory {
  id: string;
  name: string;
  industryType: string;
  location: { lat: number; lng: number; address: string };
  productionCapacity: string;
  rawMaterials: string[];
  declaredWastes: string[];
  complianceStatus: 'filed' | 'pending' | 'overdue';
  lastFiledDate?: string;
  savingsEarned: number;
  co2Avoided: number;
}

export interface CompatibilityRule {
  sourceCategory: string;
  sourceForm: string;
  targetIndustry: string;
  targetInput: string;
  compatibilityScore: number;
  notes: string;
}

export interface MaterialInfo {
  category: string;
  physicalForm: string;
  volumeEstimate: number;
  contamination: string;
  seasonalVariation: string;
  reusePotential: number;
}

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

export interface ManufacturingProcess {
  name: string;
  description: string;
  requiredEquipment: { name: string; spec: string; costInr: number }[];
  facilityRequirements: {
    spaceSqFt: number;
    powerKw: number;
    waterLpd: number;
    ventilation: string;
  };
  capexInr: number;
  timelineWeeks: number;
  regulatoryNotes: string[];
}

export interface EmissionFactors {
  landfillMethane: number;
  virginMaterialExtraction: Record<string, number>;
  transportEmissionsPerKmTon: number;
  waterSavedPerKg: Record<string, number>;
  energySavedKwhPerKg: Record<string, number>;
}

export function getFactoriesInitial(): RawFactory[] {
  return factoriesInitialJson as RawFactory[];
}

export function getFactoryFeed(): RawFactory[] {
  return factoryFeedJson as RawFactory[];
}

export function getCompatibilityRules(): CompatibilityRule[] {
  return (compatibilityMatrixJson as { rules: CompatibilityRule[] }).rules;
}

export function getMaterialsDb(): Record<string, MaterialInfo> {
  return materialsDbJson as Record<string, MaterialInfo>;
}

export function getMarketProducts(): MarketProduct[] {
  return (marketDataJson as { products: MarketProduct[] }).products;
}

export function getManufacturingProcesses(): ManufacturingProcess[] {
  return (manufacturingProcessesJson as { processes: ManufacturingProcess[] }).processes;
}

export function getEmissionFactors(): EmissionFactors {
  return (emissionFactorsJson as { emissionFactors: EmissionFactors }).emissionFactors;
}
