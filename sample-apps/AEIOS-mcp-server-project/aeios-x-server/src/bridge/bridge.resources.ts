import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { BackendClient } from './backend-client.js';

const client = new BackendClient();

export class BridgeResources {
  @Resource({
    uri: 'aeios://backend/status',
    name: 'Backend Status',
    description: 'Current status of the AEIOS-X FastAPI backend',
    mimeType: 'application/json',
  })
  async backendStatus(ctx: ExecutionContext) {
    try {
      const available = await client.isAvailable();
      if (available) {
        const status = await client.status();
        return { contents: [{ uri: 'aeios://backend/status', mimeType: 'application/json', text: JSON.stringify({ connected: true, ...status }, null, 2) }] };
      }
      return { contents: [{ uri: 'aeios://backend/status', mimeType: 'application/json', text: JSON.stringify({ connected: false, message: 'Backend offline' }, null, 2) }] };
    } catch {
      return { contents: [{ uri: 'aeios://backend/status', mimeType: 'application/json', text: JSON.stringify({ connected: false }, null, 2) }] };
    }
  }

  @Resource({
    uri: 'aeios://backend/version',
    name: 'Backend Version',
    description: 'Version info of the AEIOS-X FastAPI backend',
    mimeType: 'application/json',
  })
  async backendVersion(ctx: ExecutionContext) {
    try {
      const available = await client.isAvailable();
      if (available) {
        const version = await client.version();
        return { contents: [{ uri: 'aeios://backend/version', mimeType: 'application/json', text: JSON.stringify(version, null, 2) }] };
      }
      return { contents: [{ uri: 'aeios://backend/version', mimeType: 'application/json', text: JSON.stringify({ error: 'Backend offline' }, null, 2) }] };
    } catch {
      return { contents: [{ uri: 'aeios://backend/version', mimeType: 'application/json', text: JSON.stringify({ error: 'Unavailable' }, null, 2) }] };
    }
  }
}
