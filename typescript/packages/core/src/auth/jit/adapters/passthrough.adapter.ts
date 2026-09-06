import { ClientIdMetadataDocument } from '../../cimd.js';
import { JitBridgeConfig, JitContext, JitProviderAdapter, JitClientRegistrationResult } from '../types.js';

/**
 * Passthrough JIT Adapter for native CIMD Authorization Servers
 *
 * Used for providers that natively resolve Client ID Metadata Documents
 * on-the-fly during /authorize (e.g., Stytch).
 */
export class PassthroughJitAdapter implements JitProviderAdapter {
  readonly name = 'passthrough';

  canHandle(authServerUrl: string, config: JitBridgeConfig): boolean {
    if (config.provider === 'passthrough') return true;
    return /stytch\.com/i.test(authServerUrl);
  }

  async registerClient(
    clientDoc: ClientIdMetadataDocument,
    context: JitContext,
    _config: JitBridgeConfig
  ): Promise<JitClientRegistrationResult> {
    context.logger?.debug?.(
      `PassthroughJitAdapter: Native CIMD provider detected for "${clientDoc.client_id}". Delegating to upstream AS directly.`
    );
    return { idpClientId: clientDoc.client_id };
  }
}
