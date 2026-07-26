import { Module } from '@nitrostack/core';
import { MedGuardTools } from './medguard.tools.js';

import { DatabaseTools } from './database.tools.js';

@Module({
  name: 'medguard',
  description: 'Medication safety evaluation tools',
  controllers: [MedGuardTools, DatabaseTools],
})
export class MedGuardModule {}