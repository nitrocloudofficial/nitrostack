import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { formatMinor, store } from './gateway.store.js';

/**
 * Read-only views over gateway state, for clients that want the raw data
 * rather than a tool call.
 */
export class GatewayResources {
  @Resource({
    uri: 'novagear://catalog',
    name: 'NovaGear Catalog',
    description: 'Full product catalog with prices and normal order quantities',
    mimeType: 'application/json',
  })
  async getCatalog(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving catalog resource');
    const products = [...store.products.values()].map((p) => ({
      ...p,
      price: formatMinor(p.priceMinor),
    }));

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ store: 'NovaGear', currency: 'INR', products }, null, 2),
        },
      ],
    };
  }

  @Resource({
    uri: 'novagear://agent-registry',
    name: 'Agent Reputation Registry',
    description: 'Mock registry of buying agents: reputation, account age, dispute history',
    mimeType: 'application/json',
  })
  async getRegistry(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving agent registry resource');

    // Signing keys are registry-internal and never leave the gateway.
    const agents = [...store.agents.values()].map(({ signingKey, ...rest }) => rest);

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ count: agents.length, agents }, null, 2),
        },
      ],
    };
  }

  @Resource({
    uri: 'novagear://blocklist',
    name: 'Store Blocklist',
    description: 'Agents currently banned from the NovaGear store',
    mimeType: 'application/json',
  })
  async getBlocklist(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Serving blocklist resource');
    const blocklist = [...store.blocklist.values()];

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ count: blocklist.length, blocklist }, null, 2),
        },
      ],
    };
  }
}
