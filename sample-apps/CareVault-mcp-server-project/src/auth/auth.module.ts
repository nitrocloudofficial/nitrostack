/**
 * Authentication & Authorization Module
 * 
 * Provides role-based access control (RBAC) for the HealthPass system.
 * Roles: patient, doctor, lab_assistant
 * 
 * Features:
 * - Session management with role enforcement
 * - Consent-gated hospital access
 * - Nominee verification for senior citizens
 * - Critical alert notifications
 */

import { Module } from '@nitrostack/core';
import { AuthService } from './auth.service.js';

@Module({
  name: 'auth',
  description: 'Authentication & Authorization module with role-based access control',
  providers: [AuthService],
})
export class AuthModule {}
