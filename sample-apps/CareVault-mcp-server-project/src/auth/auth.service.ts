import { Injectable } from '@nitrostack/core';
import { Role, SessionContext, RoleCheckOptions } from './auth.types.js';

/**
 * AuthService — manages role-based access control and session context
 */
@Injectable()
export class AuthService {
  private sessionStore = new Map<string, SessionContext>();

  /**
   * Create or retrieve a session context
   */
  createSession(userId: string, role: Role, hospitalId?: string, patientId?: string, name: string = 'User'): SessionContext {
    const context: SessionContext = { userId, role, hospitalId, patientId, name };
    this.sessionStore.set(userId, context);
    return context;
  }

  /**
   * Get session context by userId
   */
  getSession(userId: string): SessionContext | undefined {
    return this.sessionStore.get(userId);
  }

  /**
   * Check if a session has required roles
   */
  checkRole(context: SessionContext | undefined, options: RoleCheckOptions): boolean {
    if (!context) return false;
    const allowedRoles = options.allowedRoles ?? options.requiredRoles ?? [];
    if (!allowedRoles.includes(context.role)) return false;
    if (options.requireHospitalId && !context.hospitalId) return false;
    return true;
  }

  /**
   * Enforce role-based access; throw if denied
   */
  enforceRole(context: SessionContext | undefined, options: RoleCheckOptions): void {
    if (!this.checkRole(context, options)) {
      const allowedRoles = options.allowedRoles ?? options.requiredRoles ?? [];
      throw new Error(
        `Access denied: role ${context?.role || 'unknown'} not in [${allowedRoles.join(', ')}]`
      );
    }
  }

  /**
   * Check if a patient can access another patient's records (self or verified nominee)
   */
  canAccessPatientRecords(
    requesterContext: SessionContext,
    targetPatientId: string,
    nomineeVerified: boolean
  ): boolean {
    if (requesterContext.role !== Role.PATIENT) return false;
    // Patient can access own records
    if (requesterContext.patientId === targetPatientId) return true;
    // Patient can access nominee's records if verified
    if (nomineeVerified && requesterContext.patientId === targetPatientId) return true;
    return false;
  }

  /**
   * Check if a doctor can access a patient's records (requires consent)
   */
  canDoctorAccessPatient(
    doctorContext: SessionContext,
    patientId: string,
    hasConsent: boolean
  ): boolean {
    if (doctorContext.role !== Role.DOCTOR) return false;
    if (!doctorContext.hospitalId) return false;
    return hasConsent;
  }

  /**
   * Check if a lab assistant can perform an action
   */
  canLabAssistantPerform(context: SessionContext): boolean {
    if (context.role !== Role.LAB_ASSISTANT) return false;
    if (!context.hospitalId) return false;
    return true;
  }

  /**
   * Clear all sessions (for testing)
   */
  clearSessions(): void {
    this.sessionStore.clear();
  }
}
