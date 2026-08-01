import { Module } from '@nitrostack/core';
import { AlertsTools } from './alerts.tools.js';
import { AlertsResources } from './alerts.resources.js';

/**
 * The agent's outbound channel: how a decision to escalate reaches a human.
 */
@Module({
  name: 'alerts',
  description: 'Proactive manager alerts raised by the agent when something needs attention',
  controllers: [AlertsTools, AlertsResources],
})
export class AlertsModule {}
