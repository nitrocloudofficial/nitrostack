/**
 * HealthPass Lite Module
 * 
 * Main module for the HealthPass Lite MCP server.
 * Registers all tools, resources, and prompts for patient healthcare management.
 */

import { Module } from '@nitrostack/core';
import { HealthPassTools } from './healthpass.tools.js';
import { HealthPassResources } from './healthpass.resources.js';
import { HealthPassPrompts } from './healthpass.prompts.js';
import { NomineeTools } from './nominee.tools.js';
import { CriticalAlertsTools } from './critical-alerts.tools.js';
import { WaitTimesTools } from './wait-times.tools.js';
import { ConsentTools } from './consent.tools.js';
import { ConsentResources } from './consent.resources.js';
import { AuthService } from '../../auth/auth.service.js';

@Module({
  name: 'healthpass',
  description: 'HealthPass Lite - Patient Healthcare Assistant',
  controllers: [
    HealthPassTools,
    HealthPassResources,
    HealthPassPrompts,
    NomineeTools,
    CriticalAlertsTools,
    WaitTimesTools,
    ConsentTools,
    ConsentResources
  ],
  providers: [AuthService]
})
export class HealthPassModule {}
