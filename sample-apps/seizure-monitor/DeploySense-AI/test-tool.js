import 'reflect-metadata';
import { AppFactory } from '@nitrostack/core';
import { InvestigationModule } from './dist/modules/investigation/investigation.module.js';

async function test() {
  const app = await AppFactory.create([InvestigationModule]);
  console.log('App created');
  const result = await app.executeTool('investigation', { action: 'investigateIncident', incidentId: 'INC-1024' });
  console.log('Result:', result);
}
test().catch(console.error);
