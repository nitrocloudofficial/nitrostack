export interface WasteStream {
  id: string;
  factoryId: string;
  factoryName: string;
  name: string;
  category: 'organic' | 'metallic' | 'polymeric' | 'chemical' | 'textile' | 'cellulosic';
  physicalForm: 'powder' | 'fiber' | 'liquid' | 'solid' | 'pellets' | 'film';
  volume: number; // kg/day or L/day
  contamination: 'clean' | 'mild' | 'high' | 'hazardous';
  seasonalVariation: 'none' | 'summer_peak' | 'winter_peak' | 'monsoon_peak';
  reusePotential: number; // 0-100
}

export interface Factory {
  id: string;
  name: string;
  industryType: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  productionCapacity: string;
  rawMaterials: string[];
  declaredWastes: string[];
  wasteStreams?: WasteStream[];
  complianceStatus: 'filed' | 'pending' | 'overdue';
  lastFiledDate?: string;
  savingsEarned: number; // INR/year
  co2Avoided: number; // tons/year
}

export interface SymbioticMatch {
  id: string;
  sourceFactoryId: string;
  sourceFactoryName: string;
  targetFactoryId: string;
  targetFactoryName: string;
  wasteStreamId: string;
  wasteStreamName: string;
  compatibilityScore: number; // 0-100
  distanceKm: number;
  volumeTonsPerYear: number;
  co2SavedTonsPerYear: number;
  savingsInrPerYear: number;
  status: 'New' | 'Evaluated' | 'Blueprint Ready' | 'Active';
}

export interface MultiHopChain {
  id: string;
  hops: SymbioticMatch[];
  totalDistanceKm: number;
  totalCo2Saved: number;
  totalSavingsInr: number;
  overallCompatibilityScore: number;
}


export interface ProductConcept {
  id: string;
  name: string;
  description: string;
  wasteStreamsUsed: {
    wasteStreamId: string;
    wasteStreamName: string;
    factoryId: string;
    factoryName: string;
    proportion: number; // percentage (0-100)
  }[];
  manufacturingProcess: string;
  feasibilityScore: number; // 0-100
  productionCostPerUnit: number; // INR
  marketPricePerUnit: number; // INR
  targetMarket: string;
  co2SavedTonsPerYear: number;
  revenuePotentialInrPerYear: number;
  status: 'New' | 'Evaluated' | 'Blueprint Ready' | 'Active';
}

export interface Blueprint {
  id: string; // matches opportunityId (SymbioticMatch or ProductConcept ID)
  opportunityId: string;
  opportunityType: 'match' | 'product';
  title: string;
  steps: string[];
  equipment: { name: string; spec: string; costInr: number }[];
  facilityRequirements: { spaceSqFt: number; powerKw: number; waterLpd: number; ventilation: string };
  capexInr: number;
  paybackMonths: number;
  timelineWeeks: number;
  regulatoryNotes: string[];
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  agent: 'Clerk' | 'Scout' | 'Profiler' | 'Matchmaker' | 'Inventor' | 'Auditor' | 'Architect' | 'Sentinel' | 'System';
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ClusterState {
  factories: Factory[];
  matches: SymbioticMatch[];
  chains: MultiHopChain[];
  products: ProductConcept[];
  blueprints: Blueprint[];
  activityLogs: ActivityLog[];
  swarmActive: boolean;
  circularScore: number; // 0-100
  totalCo2Avoided: number; // tons/year
  totalLandfillDiverted: number; // tons/year
  totalWaterSaved: number; // L/year
  totalEnergySaved: number; // kWh/year
  totalFinancialValue: number; // INR/year
}
