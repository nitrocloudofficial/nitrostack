import { Module } from '@nitrostack/core';
import { ConfirmBookingChoiceTool, GenerateVisitSummaryTool } from './booking.tools.js';
import { DataService } from '../../shared/services/data.service.js';

@Module({
  name: 'booking',
  description: 'Booking and appointment management',
  controllers: [ConfirmBookingChoiceTool, GenerateVisitSummaryTool],
  providers: [DataService]
})
export class BookingModule {}
