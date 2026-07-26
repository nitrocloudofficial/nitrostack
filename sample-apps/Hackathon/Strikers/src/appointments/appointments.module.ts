import { Module } from '@nitrostack/core';
import { DatabaseModule } from '../database/database.module.js';
import { DatabaseService } from '../database/database.service.js';
import { AppointmentsService } from './appointments.service.js';
import { AppointmentsTools } from './appointments.tools.js';

/**
 * Booking and confirmation for consultation slots.
 */
@Module({
  name: 'appointments',
  description: 'Book consultation slots and retrieve booking confirmations',
  imports: [DatabaseModule],
  providers: [DatabaseService, AppointmentsService],
  controllers: [AppointmentsTools],
})
export class AppointmentsModule {}
