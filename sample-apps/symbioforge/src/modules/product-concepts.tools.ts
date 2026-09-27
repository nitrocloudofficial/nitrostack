import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { stateManager } from './bootstrap.js';

@Injectable()
export class ProductConceptsTools {
  @Tool({
    name: 'get-product-concepts',
    description: 'Retrieve AI-invented product concepts generated from waste streams.',
    inputSchema: z.object({})
  })
  @Widget('product-cards')
  public async getProductConcepts(args: any, ctx: ExecutionContext) {
    ctx.logger.info('[SymbioForge] Retrieving product concepts');
    const state = stateManager.getState();
    return { success: true, products: state.products, widgetUri: 'ui://product-cards' };
  }
}
