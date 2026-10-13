/**
 * JWTMiddleware
 *
 * First stage of the Secure Data Gateway pipeline: establishes *who* is
 * calling, via JWT or internal API key. Produces an AuthenticatedIdentity
 * or throws AuthenticationError — it never makes an authorization
 * decision (that's RBACMiddleware's job).
 */

import type { IAuthenticationService } from '../interfaces/gateway.interfaces.js';
import type { AuthenticatedIdentity, IncomingRequest } from '../types/gateway.types.js';
import { AuthenticationError } from '../utils/errors.js';

export class JWTMiddleware {
  constructor(private readonly authentication: IAuthenticationService) {}

  async authenticate(request: IncomingRequest): Promise<AuthenticatedIdentity> {
    const { credential } = request;
    if (!credential || !credential.value) {
      throw new AuthenticationError('No credential supplied.');
    }

    if (credential.type === 'jwt') {
      return this.authentication.verifyJwt(credential.value);
    }
    if (credential.type === 'api_key') {
      return this.authentication.verifyApiKey(credential.value);
    }

    throw new AuthenticationError(`Unsupported credential type: "${credential.type}".`);
  }
}
