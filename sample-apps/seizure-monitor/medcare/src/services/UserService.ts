/**
 * UserService
 *
 * Owns non-clinical user/profile metadata: display info, preferences,
 * and session bookkeeping. Deliberately thin — anything clinically
 * sensitive (diagnoses, medications, genetic markers) lives behind
 * DatabaseService and is never handled here.
 *
 * "Never expose sensitive information directly": this service's return
 * types are metadata-only projections, not full patient/user records.
 */

import type { IDatabaseService, IUserService } from '../interfaces/gateway.interfaces.js';

interface UserProfileMetadata {
  userId: string;
  displayName: string;
  role: string;
  preferences: Record<string, unknown>;
  updatedAt: string;
}

const USER_COLLECTION = 'user_profiles';
const SESSION_COLLECTION = 'sessions';

export class UserService implements IUserService {
  constructor(private readonly db: IDatabaseService) {}

  async getProfileMetadata(userId: string): Promise<Record<string, unknown> | null> {
    const profile = await this.db.getEncryptedRecord<UserProfileMetadata>(USER_COLLECTION, userId);
    if (!profile) return null;

    // Explicit allow-list projection — new fields added to the stored
    // record are NOT exposed by default, they must be added here
    // deliberately. This is the data-minimization principle applied to
    // the User Service's own storage, not just the AI Gateway.
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      role: profile.role,
      preferences: profile.preferences,
      updatedAt: profile.updatedAt
    };
  }

  async updatePreferences(userId: string, preferences: Record<string, unknown>): Promise<void> {
    const existing = await this.db.getEncryptedRecord<UserProfileMetadata>(USER_COLLECTION, userId);
    const updated: UserProfileMetadata = {
      userId,
      displayName: existing?.displayName ?? userId,
      role: existing?.role ?? 'unknown',
      preferences: { ...(existing?.preferences ?? {}), ...preferences },
      updatedAt: new Date().toISOString()
    };
    await this.db.putEncryptedRecord(USER_COLLECTION, userId, updated);
  }

  async getSessionInfo(sessionId: string): Promise<Record<string, unknown> | null> {
    return this.db.getEncryptedRecord(SESSION_COLLECTION, sessionId);
  }
}
