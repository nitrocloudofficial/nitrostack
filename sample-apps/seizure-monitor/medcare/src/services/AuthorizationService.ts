/**
 * AuthorizationService — Role-Based Access Control
 *
 * Answers exactly the four questions the spec calls out:
 *   1. Who is making the request?        -> AuthenticatedIdentity (from AuthenticationService)
 *   2. What resource is being requested? -> ResourceType
 *   3. What action is being performed?   -> Action
 *   4. Is the user allowed?              -> isAllowed() / canAccessPatient()
 *
 * The permission matrix is declarative and additive: adding a new role or
 * resource means adding a table entry, not touching gateway logic.
 */

import type { IAuthorizationService } from '../interfaces/gateway.interfaces.js';
import {
  Action,
  AuthenticatedIdentity,
  Permission,
  ResourceType,
  Role
} from '../types/gateway.types.js';
import { AuthorizationError } from '../utils/errors.js';

const { READ, WRITE, DELETE, VERIFY, MANAGE } = Action;
const {
  OWN_REPORTS,
  ASSIGNED_PATIENTS,
  ANY_PATIENT,
  MEDICATION,
  FILE,
  USER_PROFILE,
  PLATFORM,
  AI_TASK
} = ResourceType;

/**
 * Role -> Permission matrix.
 *
 *   Patient        -> Can view own reports
 *   Doctor         -> Can view assigned patients
 *   Caregiver      -> Can view assigned (family) patients, manage files
 *   Pharmacist     -> Can verify medicines
 *   Administrator  -> Can manage platform
 */
const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  [Role.PATIENT]: [
    { resource: OWN_REPORTS, actions: [READ] },
    { resource: FILE, actions: [READ, WRITE] },
    { resource: USER_PROFILE, actions: [READ, WRITE] },
    { resource: AI_TASK, actions: [READ] }
  ],
  [Role.DOCTOR]: [
    { resource: ASSIGNED_PATIENTS, actions: [READ, WRITE] },
    { resource: MEDICATION, actions: [READ, WRITE, VERIFY] },
    { resource: FILE, actions: [READ, WRITE] },
    { resource: USER_PROFILE, actions: [READ] },
    { resource: AI_TASK, actions: [READ, WRITE] }
  ],
  [Role.CAREGIVER]: [
    { resource: ASSIGNED_PATIENTS, actions: [READ] },
    { resource: MEDICATION, actions: [READ] },
    { resource: FILE, actions: [READ, WRITE] },
    { resource: USER_PROFILE, actions: [READ, WRITE] },
    { resource: AI_TASK, actions: [READ] }
  ],
  [Role.PHARMACIST]: [
    { resource: MEDICATION, actions: [READ, VERIFY] },
    { resource: ASSIGNED_PATIENTS, actions: [READ] },
    { resource: AI_TASK, actions: [READ] }
  ],
  [Role.ADMINISTRATOR]: [
    { resource: PLATFORM, actions: [READ, WRITE, DELETE, MANAGE] },
    { resource: ANY_PATIENT, actions: [READ, WRITE, DELETE] },
    { resource: MEDICATION, actions: [READ, WRITE, DELETE, VERIFY, MANAGE] },
    { resource: FILE, actions: [READ, WRITE, DELETE, MANAGE] },
    { resource: USER_PROFILE, actions: [READ, WRITE, DELETE, MANAGE] },
    { resource: AI_TASK, actions: [READ, WRITE, MANAGE] }
  ]
};

export class AuthorizationService implements IAuthorizationService {
  isAllowed(role: Role, resource: ResourceType, action: Action): boolean {
    const grants = PERMISSION_MATRIX[role] ?? [];
    return grants.some(grant => grant.resource === resource && grant.actions.includes(action));
  }

  getPermissions(role: Role): Permission[] {
    return PERMISSION_MATRIX[role] ?? [];
  }

  /**
   * Ownership/scoping check: even if a role is generally allowed to READ
   * OWN_REPORTS or ASSIGNED_PATIENTS, this confirms the specific patient
   * record belongs to (or is assigned to) the caller.
   *
   * Administrators bypass patient-level scoping (platform-wide access);
   * every other role must have the patientId in their token's scope list.
   */
  canAccessPatient(identity: AuthenticatedIdentity, patientId: string): boolean {
    if (identity.role === Role.ADMINISTRATOR) return true;
    if (!identity.patientIds || identity.patientIds.length === 0) return false;
    return identity.patientIds.includes(patientId);
  }

  /** Convenience helper: throws AuthorizationError instead of returning false. */
  assertAllowed(role: Role, resource: ResourceType, action: Action): void {
    if (!this.isAllowed(role, resource, action)) {
      throw new AuthorizationError(
        `Role "${role}" is not permitted to perform "${action}" on "${resource}".`
      );
    }
  }

  assertCanAccessPatient(identity: AuthenticatedIdentity, patientId: string): void {
    if (!this.canAccessPatient(identity, patientId)) {
      throw new AuthorizationError(
        `User "${identity.userId}" is not authorized to access patient "${patientId}".`
      );
    }
  }
}
