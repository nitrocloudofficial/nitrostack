import { Module } from '@nitrostack/core';
import { FlightTools } from './flights.tools.js';
import { BookingTools } from './booking.tools.js';
import { FlightPrompts } from './flights.prompts.js';
import { FlightResources } from './flights.resources.js';
import { DuffelService } from '../../services/duffel.service.js';

@Module({
    name: 'flights',
    description: 'Professional flight search and booking system powered by Duffel API',
    controllers: [FlightTools, BookingTools, FlightPrompts, FlightResources],
    providers: [DuffelService]
})
export class FlightsModule { }
