/**
 * RBACMiddleware
 *
 * Second stage of the pipeline: given an already-authenticated identity,
 * decides whether the requested action on the requested resource is
 * permitted, including per-patient ownership scoping.
 */

import type { IAuthorizationService } from '../interfaces/gateway.interfaces.js';
import type { AuthenticatedIdentity, IncomingRequest } from '../types/gateway.types.js';
import { AuthorizationError } from '../utils/errors.js';

export class RBACMiddleware {
  constructor(private readonly authorization: IAuthorizationService) {}

  authorize(identity: AuthenticatedIdentity, request: IncomingRequest): void {
    if (!this.authorization.isAllowed(identity.role, request.resource, request.action)) {
      throw new AuthorizationError(
        `Role "${identity.role}" cannot perform "${request.action}" on "${request.resource}".`
      );
    }

    if (request.patientId && !this.authorization.canAccessPatient(identity, request.patientId)) {
      throw new AuthorizationError(
        `User "${identity.userId}" is not authorized to access patient "${request.patientId}".`
      );
    }
  }
}
