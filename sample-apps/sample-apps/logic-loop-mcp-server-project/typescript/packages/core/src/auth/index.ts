/**
 * NitroStack Authentication Module
 * 
 * Multiple authentication options:
 * 1. Simple JWT - For 70% of use cases (internal tools, APIs)
 * 2. API Keys - For simple scenarios (service-to-service)
 * 3. OAuth 2.1 - For enterprise/SaaS (full compliance)
 * 
 * Standards:
 * - OAuth 2.1 (IETF draft-ietf-oauth-v2-1-13)
 * - RFC 9728 - Protected Resource Metadata
 * - RFC 8414 - Authorization Server Metadata
 * - RFC 7591 - Dynamic Client Registration
 * - RFC 8707 - Resource Indicators (Token Audience Binding)
 * - RFC 7636 - PKCE
 * - RFC 7662 - Token Introspection
 * - RFC 6750 - Bearer Token Usage
 */

// ==================== SECURE SECRET HANDLING ====================

// Secure secret value wrapper (prevents hardcoding secrets)
export {
  SecretValue,
  isSecretValue,
  unwrapSecret,
  type SecretString,
  type FromValueOptions,
} from './secure-secret.js';

// ==================== SIMPLE AUTH (Recommended for most users) ====================

// Simple JWT Auth (no OAuth complexity!)
export {
  createSimpleJWTAuth,
  generateJWT,
  verifyJWT,
  decodeJWT,
  type SimpleJWTConfig,
  type JWTPayload,
  type StandardJWTClaims,
  type CustomJWTClaims,
  type GenerateJWTOptions,
} from './simple-jwt.js';

// API Key Auth (simplest option)
export {
  createAPIKeyAuth,
  generateAPIKey,
  hashAPIKey,
  isValidAPIKeyFormat,
  generateAPIKeyWithMetadata,
  validateAPIKeyWithMetadata,
  type APIKeyConfig,
  type APIKeyWithMetadata,
} from './api-key.js';

// Quick Setup Helpers (1-liner auth!)
export {
  setupJWTAuth,
  setupAPIKeyAuth,
  setupOAuthAuth,
  generateTestCredentials,
  printAuthSetupInstructions,
  validateAuthEnv,
} from './quick-setup.js';

// ==================== OAUTH 2.1 (Advanced users) ====================

// Types
export * from './types.js';

// PKCE utilities
export * from './pkce.js';

// Server metadata
export * from './server-metadata.js';

// Token validation
export * from './token-validation.js';

// Middleware (for servers)
export {
  createAuthMiddleware,
  requireScopes,
  optionalAuth,
  RequireScopes,
  isAuthenticated,
  hasScope,
  hasAnyScope,
  hasAllScopes,
} from './middleware.js';

// OAuth client (for clients)
export { OAuth2Client } from './client.js';

// Token storage
export {
  TokenStore,
  MemoryTokenStore,
  FileTokenStore,
  createDefaultTokenStore,
  isTokenExpired,
  calculateExpiration,
  tokenResponseToStored,
} from './token-store.js';

// Server integration helpers
export {
  configureServerAuth,
  createScopeGuards,
  createMCPScopeGuards,
  getStandardMCPScopes,
  validateAuthConfig,
} from './server-integration.js';

