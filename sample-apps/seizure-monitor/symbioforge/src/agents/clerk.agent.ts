import { StateManager } from '../orchestrator/state-manager.js';
import { EventBus } from '../orchestrator/event-bus.js';
import { ComplianceGenerator } from '../core/compliance-generator.js';
import { Factory } from '../core/types.js';

export class ClerkAgent {
  private stateManager: StateManager;
  private eventBus: EventBus;
  private complianceGenerator: ComplianceGenerator;

  constructor() {
    this.stateManager = StateManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.complianceGenerator = new ComplianceGenerator();
    
    this.eventBus.subscribe('COMPLIANCE_DUE', (event) => {
      if (event.type !== 'COMPLIANCE_DUE') return;
      this.stateManager.addLog('Clerk', `Received compliance reminder for ${event.payload.factoryId}. Auto-generating draft...`, 'info');
      // In a real system, it would just draft it or notify the factory. We'll generate it.
      this.generateComplianceReport(event.payload.factoryId).catch(() => {});
    });
  }

  public async registerFactory(factoryData: Omit<Factory, 'savingsEarned' | 'co2Avoided'>): Promise<{ factory: Factory; reportPath: string }> {
    const factory: Factory = {
      ...factoryData,
      savingsEarned: 0,
      co2Avoided: 0,
      complianceStatus: 'filed',
      lastFiledDate: new Date().toISOString().split('T')[0]
    };

    this.stateManager.addFactory(factory);
    this.stateManager.addLog('Clerk', `New registration: "${factory.name}"`, 'success');

    // Generate PDF asynchronously
    const reportPath = await this.complianceGenerator.generateSpcbReport(factory);
    this.stateManager.addLog('Clerk', `SPCB Annual Statement generated for "${factory.name}" at ${reportPath}`, 'success');

    // Trigger Scout
    this.eventBus.publish({
      type: 'FACTORY_REGISTERED',
      payload: { factoryId: factory.id }
    });

    return { factory, reportPath };
  }

  public async generateComplianceReport(factoryId: string): Promise<string | null> {
    const factory = this.stateManager.getFactory(factoryId);
    if (!factory) return null;

    return await this.complianceGenerator.generateSpcbReport(factory);
  }
}
