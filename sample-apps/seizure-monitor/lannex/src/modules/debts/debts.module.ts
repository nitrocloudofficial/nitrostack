import { Module } from '@nitrostack/core';
import { DebtsService } from './debts.service.js';
import { DebtsTools } from './debts.tools.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  name: 'debts',
  imports: [DatabaseModule],
  providers: [DebtsService],
  controllers: [DebtsTools],
  exports: [DebtsService]
})
export class DebtsModule {}
