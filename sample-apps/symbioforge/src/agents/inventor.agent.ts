import { StateManager } from '../orchestrator/state-manager.js';
import { EventBus } from '../orchestrator/event-bus.js';
import { ProductGenerator } from '../core/product-generator.js';

export class InventorAgent {
  private stateManager: StateManager;
  private eventBus: EventBus;
  private productGenerator: ProductGenerator;

  constructor() {
    this.stateManager = StateManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.productGenerator = new ProductGenerator();
    this.setupListeners();
  }

  private setupListeners() {
    this.eventBus.subscribe('PRODUCTS_INVENTED', (event) => {
      if (event.type !== 'PRODUCTS_INVENTED') return;
      this.inventProducts();
    });
  }

  public inventProducts() {
    const factories = this.stateManager.getFactories();
    this.stateManager.addLog('Inventor', 'Analyzing waste portfolio to generate novel product concepts...', 'info');

    const oldProducts = this.stateManager.getProducts();
    const oldStatusMap = new Map(oldProducts.map(p => [p.id, p.status]));

    const products = this.productGenerator.generateProducts(factories);
    for (const p of products) {
      const prev = oldStatusMap.get(p.id);
      if (prev && prev !== 'New') {
        p.status = prev;
      }
    }
    this.stateManager.setProducts(products);

    this.stateManager.addLog(
      'Inventor',
      `Generated ${products.length} novel product concepts. Top concept: ${products[0] ? `"${products[0].name}" (Feasibility: ${products[0].feasibilityScore}%)` : 'None'}`,
      'success'
    );

    // Trigger Auditor
    this.eventBus.publish({
      type: 'IMPACT_AUDITED',
      payload: { opportunityIds: [] }
    });
  }
}
