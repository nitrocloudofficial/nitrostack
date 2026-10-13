import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ContentModule } from './modules/content/content.module.js';
import { StudentModule } from './modules/student/student.module.js';
import { CohortModule } from './modules/cohort/cohort.module.js';
import { RecordsModule } from './modules/records/records.module.js';
import { WardenGuard } from './foray/warden.guard.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * FORAY — permission-scoped MCP surface.
 *
 * Four servers, one permission boundary:
 *
 *   Course Content    all roles, read-only
 *   Student Model     Loop 1 agents + Compass.  FACULTY BLOCKED.
 *   Cohort Analytics  Loop 2 agents + faculty.  No raw text, structurally.
 *   Class Records     roster (faculty) + the append-only chat log (R-11 —
 *                     Loop 1 agents + the student; FACULTY BLOCKED).
 *
 * The agents are separate because their PERMISSIONS are separate. Every
 * tool on every module runs behind WardenGuard, which checks the caller's
 * role against the matrix in foray/permissions.ts and writes an AccessLog
 * row on denial. That row is demo beat 6.
 *
 * All business logic lives in the Python core. These tools are a scoped
 * surface, not a second implementation.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'foray',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Foray — permission-scoped MCP servers for a school of agents',
  imports: [
    ConfigModule.forRoot(),
    ContentModule,
    StudentModule,
    CohortModule,
    RecordsModule,
  ],
  providers: [
    WardenGuard,
    SystemHealthCheck,
  ],
})
export class AppModule {}
