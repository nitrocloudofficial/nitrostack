import { StateManager } from '../orchestrator/state-manager.js';
import { EventBus } from '../orchestrator/event-bus.js';
import { WasteClassifier } from '../core/waste-classifier.js';
import { WasteStream } from '../core/types.js';

const INDUSTRY_WASTE_MAP: Record<string, string[]> = {
  'Textile Manufacturing': ['Cotton lint', 'Polyester scraps', 'Dye effluent', 'Cardboard packaging', 'Boiler ash'],
  'Food Processing': ['Rice husk', 'Bran', 'Wastewater', 'Plastic bags', 'Spent grain'],
  'Paper Manufacturing': ['Paper sludge', 'Boiler ash', 'Wastewater', 'Cardboard packaging'],
  'Plastics Recycling': ['Plastic wash water', 'Unrecyclable plastic residue', 'PE film scraps'],
  'Plastics Manufacturing': ['PE film scraps', 'PP purgings', 'Defective molded parts', 'Plastic bags'],
  'Packaging Manufacturing': ['Paper trimmings', 'Adhesive residue', 'Cardboard packaging'],
  'Metal Workshop': ['Aluminum shavings', 'Steel scrap', 'Spent cutting oil'],
  'Metal Casting': ['Foundry sand', 'Slag', 'Flue dust', 'Steel scrap'],
  'Chemical Processing': ['Spent solvent', 'Filter cake', 'Chemical wash water'],
  'Construction Materials': ['Concrete wash water', 'Broken block scrap', 'Coal ash'],
  'Beverage Manufacturing': ['Spent grain', 'Yeast sludge', 'Wastewater'],
  'Leather Processing': ['Chrome shavings', 'Fleshing waste', 'Tannery effluent'],
  'Fertilizer Manufacturing': ['Dust emissions', 'Spilled raw materials', 'Wastewater'],
  'Glass Manufacturing': ['Glass cullet scrap', 'Furnace slag', 'Flue dust'],
  'Brick Manufacturing': ['Broken brick scrap', 'Coal ash', 'Flue dust'],
};

export class ProfilerAgent {
  private stateManager: StateManager;
  private eventBus: EventBus;
  private wasteClassifier: WasteClassifier;

  constructor() {
    this.stateManager = StateManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.wasteClassifier = new WasteClassifier();
    this.setupListeners();
  }

  private setupListeners() {
    this.eventBus.subscribe('FACTORY_PROFILED', (event) => {
      if (event.type !== 'FACTORY_PROFILED') return;
      this.profileFactoryWastes(event.payload.factoryId);
    });
  }

  private inferUndeclaredWastes(industryType: string, declaredWastes: string[]): string[] {
    const known = INDUSTRY_WASTE_MAP[industryType];
    if (!known) return [];
    const declaredSet = new Set(declaredWastes.map(w => w.toLowerCase()));
    return known.filter(w => !declaredSet.has(w.toLowerCase()));
  }

  public profileFactoryWastes(factoryId: string) {
    const factory = this.stateManager.getFactory(factoryId);
    if (!factory) return;

    this.stateManager.addLog('Profiler', `Activating deep inference profiling for "${factory.name}" (${factory.industryType})`, 'info');

    // --- 1. Classify explicitly declared wastes ---
    const declaredStreams: WasteStream[] = factory.declaredWastes.map(wasteName =>
      this.wasteClassifier.classifyWaste(factory.id, factory.name, wasteName)
    );

    // --- 2. Infer undeclared wastes from industry type (at 40% volume to mark as inferred) ---
    const inferredNames = this.inferUndeclaredWastes(factory.industryType, factory.declaredWastes);
    const inferredStreams: WasteStream[] = inferredNames.map(wasteName => {
      const stream = this.wasteClassifier.classifyWaste(factory.id, factory.name, wasteName);
      stream.volume = Math.round(stream.volume * 0.4);
      return stream;
    });

    // --- 3. Merge and update state ---
    const allStreams = [...declaredStreams, ...inferredStreams];
    this.stateManager.updateFactoryWastes(factory.id, allStreams);

    if (inferredStreams.length > 0) {
      this.stateManager.addLog(
        'Profiler',
        `Inferred ${inferredStreams.length} undeclared stream(s) for "${factory.name}" based on ${factory.industryType} profile: ${inferredNames.join(', ')}`,
        'info'
      );
    }

    const summaryParts = allStreams.map(w =>
      `${w.name} (${w.category}/${w.physicalForm}, ${w.volume}kg/day, reuse: ${w.reusePotential}%)`
    );

    this.stateManager.addLog(
      'Profiler',
      `Classified ${declaredStreams.length} declared + inferred ${inferredStreams.length} additional streams for "${factory.name}": ${summaryParts.join(' | ')}`,
      'success'
    );

    // Trigger Matchmaker and Inventor
    this.eventBus.publish({
      type: 'MATCHES_DISCOVERED',
      payload: { matchIds: [] }
    });
  }
}
