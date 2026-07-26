import {
  getFactoriesInitial,
  getCompatibilityRules,
  getMaterialsDb,
  getMarketProducts,
  getManufacturingProcesses,
  getEmissionFactors,
} from './data';
import type {
  Factory,
  WasteStream,
  SymbioticMatch,
  ProductConcept,
  Blueprint,
  ActivityLog,
  ClusterState,
} from './types';

// ---------------------------------------------------------------------------
// Deterministic seeded random (so results are stable across restarts)
// ---------------------------------------------------------------------------
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

let rand = seededRandom(42);

function resetRand(): void {
  rand = seededRandom(42);
}

function randBetween(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Haversine distance (km)
// ---------------------------------------------------------------------------
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// State container (singleton)
// ---------------------------------------------------------------------------
class SymbioticEngine {
  private factories: Factory[] = [];
  private matches: SymbioticMatch[] = [];
  private products: ProductConcept[] = [];
  private blueprints: Blueprint[] = [];
  private activityLogs: ActivityLog[] = [];
  private swarmActive = false;
  private initialized = false;
  private nextFactoryNum = 100;

  // ---- Initialization -----------------------------------------------------

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    const rawFactories = getFactoriesInitial();
    const materialsDb = getMaterialsDb();

    // Build factories with waste streams
    this.factories = rawFactories.map((rf) => {
      const wasteStreams: WasteStream[] = rf.declaredWastes.map(
        (wasteName, idx) => {
          const mat = materialsDb[wasteName];
          return {
            id: `${rf.id}_ws_${idx + 1}`,
            factoryId: rf.id,
            factoryName: rf.name,
            name: wasteName,
            category: (mat?.category ?? 'chemical') as WasteStream['category'],
            physicalForm: (mat?.physicalForm ?? 'solid') as WasteStream['physicalForm'],
            volume: mat?.volumeEstimate ?? 50,
            contamination: (mat?.contamination ?? 'mild') as WasteStream['contamination'],
            seasonalVariation: (mat?.seasonalVariation ?? 'none') as WasteStream['seasonalVariation'],
            reusePotential: mat?.reusePotential ?? 50,
          };
        }
      );
      return { ...rf, wasteStreams };
    });

    this.log('System', 'Engine initialized with ' + this.factories.length + ' factories.', 'info');

    this.runMatchmaking();
    this.runProductGeneration();
    this.generateBlueprints();
  }

  // ---- Activity log -------------------------------------------------------

  private log(
    agent: ActivityLog['agent'],
    message: string,
    type: ActivityLog['type']
  ): void {
    this.activityLogs.push({
      id: `log_${this.activityLogs.length + 1}`,
      timestamp: new Date().toISOString(),
      agent,
      message,
      type,
    });
  }

  // ---- Matchmaking --------------------------------------------------------

  runMatchmaking(): void {
    resetRand();
    const rules = getCompatibilityRules();
    const emissionFactors = getEmissionFactors();
    this.matches = [];

    for (const source of this.factories) {
      for (const target of this.factories) {
        if (source.id === target.id) continue;

        for (const ws of source.wasteStreams ?? []) {
          // Check compatibility rules
          const rule = rules.find(
            (r) =>
              r.sourceCategory === ws.category &&
              r.sourceForm === ws.physicalForm &&
              r.targetIndustry === target.industryType &&
              target.rawMaterials.some((rm) => rm === r.targetInput)
          );
          if (!rule) continue;

          const distanceKm = haversineKm(
            source.location.lat,
            source.location.lng,
            target.location.lat,
            target.location.lng
          );

          const volumeTons = ws.volume;
          const co2Factor =
            emissionFactors.virginMaterialExtraction[
              rule.targetInput
            ] ?? 0.5;
          const co2Saved = +(volumeTons * co2Factor).toFixed(1);
          const savingsInr = +(volumeTons * randBetween(800, 2500)).toFixed(0);

          const statuses: SymbioticMatch['status'][] = [
            'New',
            'Evaluated',
            'Blueprint Ready',
            'Active',
          ];

          this.matches.push({
            id: `match_${this.matches.length + 1}`,
            sourceFactoryId: source.id,
            sourceFactoryName: source.name,
            targetFactoryId: target.id,
            targetFactoryName: target.name,
            wasteStreamId: ws.id,
            wasteStreamName: ws.name,
            compatibilityScore: rule.compatibilityScore,
            distanceKm: +distanceKm.toFixed(2),
            volumeTonsPerYear: volumeTons,
            co2SavedTonsPerYear: co2Saved,
            savingsInrPerYear: savingsInr,
            status: statuses[randBetween(0, 3)],
          });
        }
      }
    }

    // Update factory-level metrics based on matches
    for (const f of this.factories) {
      const factoryMatches = this.matches.filter(
        (m) => m.sourceFactoryId === f.id || m.targetFactoryId === f.id
      );
      f.co2Avoided = +factoryMatches
        .reduce((sum, m) => sum + m.co2SavedTonsPerYear, 0)
        .toFixed(1);
      f.savingsEarned = +factoryMatches
        .reduce((sum, m) => sum + m.savingsInrPerYear, 0)
        .toFixed(0);
    }

    this.log(
      'Matchmaker',
      `Found ${this.matches.length} symbiotic matches across ${this.factories.length} factories.`,
      'success'
    );
  }

  // ---- Product generation -------------------------------------------------

  runProductGeneration(): void {
    const marketProducts = getMarketProducts();
    const materialsDb = getMaterialsDb();
    this.products = [];

    for (const mp of marketProducts) {
      // Find factories that produce the required waste streams
      const wasteStreamsUsed: ProductConcept['wasteStreamsUsed'] = [];
      let feasible = true;

      for (const wsName of mp.wasteStreams) {
        let found = false;
        for (const f of this.factories) {
          const ws = f.wasteStreams?.find((w) => w.name === wsName);
          if (ws) {
            wasteStreamsUsed.push({
              wasteStreamId: ws.id,
              wasteStreamName: ws.name,
              factoryId: f.id,
              factoryName: f.name,
              proportion: +(1 / mp.wasteStreams.length).toFixed(2),
            });
            found = true;
            break;
          }
        }
        if (!found) feasible = false;
      }

      if (!feasible) continue;

      const totalVolume = wasteStreamsUsed.reduce((sum, w) => {
        const mat = materialsDb[w.wasteStreamName];
        return sum + (mat?.volumeEstimate ?? 50);
      }, 0);

      const co2Saved = +(totalVolume * 0.8).toFixed(1);
      const annualUnits = totalVolume * 1000;
      const revenuePotential = +(
        annualUnits *
        (mp.marketPricePerUnit - mp.productionCostPerUnit)
      ).toFixed(0);

      const statuses: ProductConcept['status'][] = [
        'New',
        'Evaluated',
        'Blueprint Ready',
        'Active',
      ];

      this.products.push({
        id: `prod_${this.products.length + 1}`,
        name: mp.name,
        description: mp.description,
        wasteStreamsUsed,
        manufacturingProcess: mp.manufacturingProcess,
        feasibilityScore: randBetween(65, 95),
        productionCostPerUnit: mp.productionCostPerUnit,
        marketPricePerUnit: mp.marketPricePerUnit,
        targetMarket: mp.targetMarket,
        co2SavedTonsPerYear: co2Saved,
        revenuePotentialInrPerYear: revenuePotential,
        status: statuses[randBetween(0, 3)],
      });
    }

    this.log(
      'Inventor',
      `Generated ${this.products.length} product concepts from waste streams.`,
      'success'
    );
  }

  // ---- Blueprint generation -----------------------------------------------

  private generateBlueprints(): void {
    const processes = getManufacturingProcesses();
    this.blueprints = [];

    // Generate blueprints for matches with status "Blueprint Ready" or "Active"
    const qualifiedMatches = this.matches.filter(
      (m) => m.status === 'Blueprint Ready' || m.status === 'Active'
    );
    for (const match of qualifiedMatches) {
      const proc = processes[randBetween(0, processes.length - 1)];
      this.blueprints.push({
        id: `bp_match_${match.id}`,
        opportunityId: match.id,
        opportunityType: 'match',
        title: `Symbiotic link: ${match.wasteStreamName} from ${match.sourceFactoryName} to ${match.targetFactoryName}`,
        steps: [
          `Collect ${match.wasteStreamName} from ${match.sourceFactoryName}`,
          `Pre-process waste via ${proc.name}`,
          `Transport ${match.distanceKm} km to ${match.targetFactoryName}`,
          `Integrate into ${match.targetFactoryName} production line`,
          `Monitor quality and adjust proportions`,
        ],
        equipment: proc.requiredEquipment,
        facilityRequirements: proc.facilityRequirements,
        capexInr: proc.capexInr,
        paybackMonths: match.savingsInrPerYear > 0 ? Math.ceil(proc.capexInr / (match.savingsInrPerYear / 12)) : 0,
        timelineWeeks: proc.timelineWeeks,
        regulatoryNotes: proc.regulatoryNotes,
      });
    }

    // Generate blueprints for products with status "Blueprint Ready" or "Active"
    const qualifiedProducts = this.products.filter(
      (p) => p.status === 'Blueprint Ready' || p.status === 'Active'
    );
    for (const product of qualifiedProducts) {
      const proc = processes.find(
        (p) => p.name === product.manufacturingProcess
      ) ?? processes[0];
      this.blueprints.push({
        id: `bp_prod_${product.id}`,
        opportunityId: product.id,
        opportunityType: 'product',
        title: `Product line: ${product.name}`,
        steps: [
          `Source waste streams: ${product.wasteStreamsUsed.map((w) => w.wasteStreamName).join(', ')}`,
          `Set up ${proc.name} facility`,
          `Install ${proc.requiredEquipment.map((e) => e.name).join(', ')}`,
          `Run pilot batch and quality testing`,
          `Scale to full production for ${product.targetMarket}`,
        ],
        equipment: proc.requiredEquipment,
        facilityRequirements: proc.facilityRequirements,
        capexInr: proc.capexInr,
        paybackMonths: product.revenuePotentialInrPerYear > 0 ? Math.ceil(
          proc.capexInr / (product.revenuePotentialInrPerYear / 12)
        ) : 0,
        timelineWeeks: proc.timelineWeeks,
        regulatoryNotes: proc.regulatoryNotes,
      });
    }

    this.log(
      'Architect',
      `Generated ${this.blueprints.length} implementation blueprints.`,
      'success'
    );
  }

  // ---- Public API methods -------------------------------------------------

  getState(): ClusterState {
    const totalCo2Avoided = +this.matches
      .reduce((s, m) => s + m.co2SavedTonsPerYear, 0)
      .toFixed(1);
    const totalLandfillDiverted = +this.matches
      .reduce((s, m) => s + m.volumeTonsPerYear, 0)
      .toFixed(1);
    const totalFinancialValue = +this.matches
      .reduce((s, m) => s + m.savingsInrPerYear, 0)
      .toFixed(0);
    const totalWaterSaved = +(totalLandfillDiverted * 15).toFixed(0); // approx 15 L/ton

    const circularScore = Math.min(
      100,
      Math.round(
        (this.matches.filter((m) => m.status === 'Active').length /
          Math.max(this.matches.length, 1)) *
          100 +
          (this.products.filter((p) => p.status === 'Active').length /
            Math.max(this.products.length, 1)) *
            50
      )
    );

    return {
      factories: this.factories,
      matches: this.matches,
      products: this.products,
      blueprints: this.blueprints,
      activityLogs: this.activityLogs,
      swarmActive: this.swarmActive,
      circularScore,
      totalCo2Avoided,
      totalLandfillDiverted,
      totalWaterSaved,
      totalFinancialValue,
    };
  }

  getFactories(): Factory[] {
    return this.factories;
  }

  replaceFactories(factories: Factory[]): void {
    const materialsDb = getMaterialsDb();
    this.factories = factories.map((factory) => ({
      ...factory,
      wasteStreams: factory.wasteStreams?.length
        ? factory.wasteStreams
        : factory.declaredWastes.map((wasteName, idx) => {
            const mat = materialsDb[wasteName];
            return {
              id: `${factory.id}_ws_${idx + 1}`,
              factoryId: factory.id,
              factoryName: factory.name,
              name: wasteName,
              category: (mat?.category ?? "chemical") as WasteStream["category"],
              physicalForm: (mat?.physicalForm ?? "solid") as WasteStream["physicalForm"],
              volume: mat?.volumeEstimate ?? 50,
              contamination: (mat?.contamination ?? "mild") as WasteStream["contamination"],
              seasonalVariation: (mat?.seasonalVariation ?? "none") as WasteStream["seasonalVariation"],
              reusePotential: mat?.reusePotential ?? 50,
            };
          }),
    }));

    this.matches = [];
    this.products = [];
    this.blueprints = [];
    this.runMatchmaking();
    this.runProductGeneration();
    this.generateBlueprints();
    this.log("System", `State synchronized from database with ${this.factories.length} factories.`, "info");
  }

  registerFactory(data: {
    name: string;
    industryType: string;
    location: { lat: number; lng: number; address: string };
    productionCapacity: string;
    rawMaterials: string[];
    declaredWastes: string[];
  }): Factory {
    const materialsDb = getMaterialsDb();
    const id = `fact_${this.nextFactoryNum++}`;
    const wasteStreams: WasteStream[] = data.declaredWastes.map(
      (wasteName, idx) => {
        const mat = materialsDb[wasteName];
        return {
          id: `${id}_ws_${idx + 1}`,
          factoryId: id,
          factoryName: data.name,
          name: wasteName,
          category: (mat?.category ?? 'chemical') as WasteStream['category'],
          physicalForm: (mat?.physicalForm ?? 'solid') as WasteStream['physicalForm'],
          volume: mat?.volumeEstimate ?? 50,
          contamination: (mat?.contamination ?? 'mild') as WasteStream['contamination'],
          seasonalVariation: (mat?.seasonalVariation ?? 'none') as WasteStream['seasonalVariation'],
          reusePotential: mat?.reusePotential ?? 50,
        };
      }
    );

    const factory: Factory = {
      id,
      name: data.name,
      industryType: data.industryType,
      location: data.location,
      productionCapacity: data.productionCapacity,
      rawMaterials: data.rawMaterials,
      declaredWastes: data.declaredWastes,
      wasteStreams,
      complianceStatus: 'pending',
      savingsEarned: 0,
      co2Avoided: 0,
    };

    this.factories.push(factory);
    this.log('Clerk', `Registered new factory: ${data.name}`, 'success');

    // Re-run matchmaking to include the new factory
    this.runMatchmaking();

    return factory;
  }

  getMatches(): SymbioticMatch[] {
    return this.matches;
  }

  getProducts(): ProductConcept[] {
    return this.products;
  }

  getEcosystemMap(): {
    nodes: { id: string; label: string; type: string; lat: number; lng: number }[];
    edges: { id: string; source: string; target: string; label: string; weight: number }[];
  } {
    const nodes = this.factories.map((f) => ({
      id: f.id,
      label: f.name,
      type: f.industryType,
      lat: f.location.lat,
      lng: f.location.lng,
    }));

    const edges = this.matches
      .filter((m) => m.compatibilityScore >= 70)
      .map((m) => ({
        id: m.id,
        source: m.sourceFactoryId,
        target: m.targetFactoryId,
        label: m.wasteStreamName,
        weight: m.compatibilityScore,
      }));

    return { nodes, edges };
  }

  getOpportunityFeed(): {
    id: string;
    type: 'match' | 'product';
    title: string;
    score: number;
    co2Impact: number;
    financialImpact: number;
    status: string;
  }[] {
    const matchOpps = this.matches.map((m) => ({
      id: m.id,
      type: 'match' as const,
      title: `${m.wasteStreamName}: ${m.sourceFactoryName} -> ${m.targetFactoryName}`,
      score: m.compatibilityScore,
      co2Impact: m.co2SavedTonsPerYear,
      financialImpact: m.savingsInrPerYear,
      status: m.status,
    }));

    const productOpps = this.products.map((p) => ({
      id: p.id,
      type: 'product' as const,
      title: p.name + ' — ' + p.description,
      score: p.feasibilityScore,
      co2Impact: p.co2SavedTonsPerYear,
      financialImpact: p.revenuePotentialInrPerYear,
      status: p.status,
    }));

    return [...matchOpps, ...productOpps].sort((a, b) => b.score - a.score);
  }

  getCarbonMetrics(): {
    totalCo2Avoided: number;
    totalLandfillDiverted: number;
    totalWaterSaved: number;
    totalEnergySaved: number;
    byFactory: { factoryId: string; factoryName: string; co2Avoided: number; landfillDiverted: number }[];
    byWasteCategory: Record<string, { co2: number; volume: number }>;
  } {
    const totalCo2Avoided = +this.matches
      .reduce((s, m) => s + m.co2SavedTonsPerYear, 0)
      .toFixed(1);
    const totalLandfillDiverted = +this.matches
      .reduce((s, m) => s + m.volumeTonsPerYear, 0)
      .toFixed(1);
    const totalWaterSaved = +(totalLandfillDiverted * 15).toFixed(0);
    const totalEnergySaved = +(totalLandfillDiverted * 5.2).toFixed(0);

    const byFactory = this.factories.map((f) => ({
      factoryId: f.id,
      factoryName: f.name,
      co2Avoided: f.co2Avoided,
      landfillDiverted: +(
        (f.wasteStreams ?? []).reduce((s, w) => s + w.volume, 0)
      ).toFixed(1),
    }));

    const byWasteCategory: Record<string, { co2: number; volume: number }> = {};
    for (const m of this.matches) {
      const ws = this.factories
        .flatMap((f) => f.wasteStreams ?? [])
        .find((w) => w.id === m.wasteStreamId);
      if (ws) {
        if (!byWasteCategory[ws.category]) {
          byWasteCategory[ws.category] = { co2: 0, volume: 0 };
        }
        byWasteCategory[ws.category].co2 += m.co2SavedTonsPerYear;
        byWasteCategory[ws.category].volume += m.volumeTonsPerYear;
      }
    }

    return {
      totalCo2Avoided,
      totalLandfillDiverted,
      totalWaterSaved,
      totalEnergySaved,
      byFactory,
      byWasteCategory,
    };
  }

  getWasteProfiles(): {
    factoryId: string;
    factoryName: string;
    industryType: string;
    wasteStreams: WasteStream[];
  }[] {
    return this.factories.map((f) => ({
      factoryId: f.id,
      factoryName: f.name,
      industryType: f.industryType,
      wasteStreams: f.wasteStreams ?? [],
    }));
  }

  getBlueprintByOpportunityId(id: string): Blueprint | undefined {
    return this.blueprints.find((b) => b.opportunityId === id);
  }

  setSwarmActive(active: boolean): void {
    this.swarmActive = active;
    this.log(
      'Sentinel',
      `Swarm ${active ? 'activated' : 'deactivated'}.`,
      active ? 'success' : 'warning'
    );
  }

  resetState(): void {
    this.factories = [];
    this.matches = [];
    this.products = [];
    this.blueprints = [];
    this.activityLogs = [];
    this.swarmActive = false;
    this.initialized = false;
    this.nextFactoryNum = 100;
    this.init();
    this.log('System', 'State reset and re-initialized.', 'info');
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------
const globalForEngine = globalThis as unknown as { _symbioticEngine?: SymbioticEngine };

if (!globalForEngine._symbioticEngine) {
  globalForEngine._symbioticEngine = new SymbioticEngine();
}

const engine = globalForEngine._symbioticEngine;
engine.init();

export { engine };
