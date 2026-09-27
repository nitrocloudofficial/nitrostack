import { McpApp, Module, ConfigModule, OAuthModule } from '@nitrostack/core';
import { FlightsModule } from './modules/flights/flights.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 * 
 * OAuth 2.1 Authentication:
 * - Configured with Auth0 as the authorization server
 * - Supports read, write, and admin scopes
 * - Validates tokens with audience binding (RFC 8707)
 * 
 * Flight Booking System:
 * - Powered by Duffel API
 * - Professional flight search and booking capabilities
 * - Comprehensive widgets for search results and flight details
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'airline-ticketing-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Airline ticketing MCP server with OAuth 2.1 authentication and Duffel integration',
  imports: [
    ConfigModule.forRoot(),

    // Conditionally load OAuth 2.1 authentication only when OAUTH_REQUIRED=true
    ...(process.env.OAUTH_REQUIRED === 'true'
      ? [
          OAuthModule.forRoot({
            required: true,
            resourceUri: process.env.RESOURCE_URI || 'https://mcplocal',
            authorizationServers: [
              process.env.AUTH_SERVER_URL || 'https://dev-5dt0utuk31h13tjm.us.auth0.com',
            ],
            scopesSupported: [
              'read',        // Read access to resources
              'write',       // Write/modify resources
              'admin',       // Administrative operations
            ],
            tokenIntrospectionEndpoint: process.env.INTROSPECTION_ENDPOINT,
            tokenIntrospectionClientId: process.env.INTROSPECTION_CLIENT_ID,
            tokenIntrospectionClientSecret: process.env.INTROSPECTION_CLIENT_SECRET,
            audience: process.env.TOKEN_AUDIENCE,
            issuer: process.env.TOKEN_ISSUER,
            customValidation: async (_tokenPayload) => {
              return true;
            },
          }),
        ]
      : []),

    FlightsModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule { }
