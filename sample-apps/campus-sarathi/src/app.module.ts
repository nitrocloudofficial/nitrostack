import { McpApp, Module, ConfigModule, OAuthModule } from '@nitrostack/core';
import { CalendarModule } from './modules/calendar/calendar.module.js';
import { GmailModule } from './modules/gmail/gmail.module.js';
import { TodoModule } from './modules/todo/todo.module.js';
import { CampusInfoModule } from './modules/campus-info/campus-info.module.js';
import { PlannerModule } from './modules/planner/planner.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  name: 'app',
  imports: [
    ConfigModule.forRoot(),
    OAuthModule.forRoot({
      resourceUri: process.env.RESOURCE_URI || 'https://mcplocal',
      authorizationServers: [process.env.AUTH_SERVER_URL || 'https://dev-5dt0utuk315713tjm.us.auth0.com'],
      scopesSupported: ['read', 'write', 'admin']
    }),
    AuthModule,
    HealthModule,
    CalendarModule,
    GmailModule,
    TodoModule,
    CampusInfoModule,
    PlannerModule
  ],
  providers: [],
  controllers: []
})
export class AppModule {}


@McpApp({
  server: {
    name: 'campus-sarathi',
    version: '1.0.0'
  },
  logging: { level: 'info' },
  module: AppModule
})
export class App {}


