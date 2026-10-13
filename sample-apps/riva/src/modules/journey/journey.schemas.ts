import { z } from '@nitrostack/core';
import { preferencesSchema } from '../rides/rides.tools.js';

export const travelConciergeSchema = z.object({
  origin: z.string().describe('Where the traveler currently is / will start from, e.g. "Amrita University"'),
  destination: z.string().describe('Where the traveler needs to arrive, e.g. "Coimbatore Airport"'),
  arriveBy: z.string().describe('Target arrival time, e.g. "8 AM tomorrow", "tomorrow 8am", "2026-07-27T08:00"'),
  bufferMinutes: z.number().min(0).optional().describe('Extra safety buffer in minutes (default: auto — larger for airports)'),
});

export const rideLaterForecastSchema = z.object({
  origin: z.string().describe('Pickup location'),
  destination: z.string().describe('Drop-off location'),
  time: z.string().describe('Target future time, e.g. "tomorrow 7 AM", "7 AM"'),
});

export const multiStopTripPlannerSchema = z.object({
  stops: z
    .array(z.string())
    .min(2)
    .describe('Ordered list of stops including the starting point and final destination, e.g. ["Amrita University", "Gandhipuram", "Coimbatore Airport"]'),
});

export const carPoolingAssistantSchema = z.object({
  origin: z.string().describe('Pickup location'),
  destination: z.string().describe('Drop-off location'),
  maxExtraMinutes: z.number().positive().optional().describe('Maximum extra travel time willing to accept for a pooled ride (default: 15)'),
});

export const bookingSimulationSchema = z.object({
  searchId: z.string().optional().describe('The searchId returned by find_rides (required to start a new booking)'),
  optionId: z.string().optional().describe('The optionId of the ride to book (required to start a new booking)'),
  bookingId: z.string().optional().describe('An existing bookingId — provide this to check/advance status of an existing booking'),
  confirmed: z
    .boolean()
    .optional()
    .default(false)
    .describe('Must be explicitly true to actually create the booking. If false/omitted, returns a confirmation preview only — no booking is created.'),
});

export const sosEmergencySchema = z.object({
  currentLocation: z.string().describe('The rider\'s current location'),
  bookingId: z.string().optional().describe('An active booking ID, if this is happening during a simulated trip'),
  note: z.string().optional().describe('Optional note about the situation'),
});

export { preferencesSchema };
