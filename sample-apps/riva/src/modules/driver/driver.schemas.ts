import { z } from '@nitrostack/core';
import { vehicleTypeSchema } from '../rides/rides.tools.js';

/** Reuses the same provider set as the rider side (Uber, Ola, Rapido). */
export const providerSchema = z.enum(['uber', 'ola', 'rapido']);

export const fuelTypeSchema = z.enum(['petrol', 'diesel', 'cng', 'electric']);

export const analyseDriverTripSchema = z.object({
  provider: providerSchema.describe('The platform offering the trip'),
  offeredFare: z.number().positive().describe('The fare offered for the trip, in INR'),
  tripDistance: z.number().positive().describe('Trip distance in km (pickup to drop)'),
  pickupDistance: z.number().min(0).describe('Distance from the driver\'s current location to the pickup point, in km'),
  vehicleType: vehicleTypeSchema.describe('The vehicle being driven'),
  fuelType: fuelTypeSchema.describe('Fuel type of the vehicle'),
  currentLocation: z.string().describe('The driver\'s current location'),
  destination: z.string().describe('The trip drop-off location'),
});

export const getDestinationDemandSchema = z.object({
  destination: z.string().describe('The location to check demand for'),
  time: z.string().optional().describe('Time to check demand at, e.g. "6 PM", "now" (default: now)'),
});

export const suggestNextDriverZoneSchema = z.object({
  currentLocation: z.string().describe('The driver\'s current location'),
  time: z.string().optional().describe('Time to plan for, e.g. "6 PM", "now" (default: now)'),
  vehicleType: vehicleTypeSchema.optional().describe('The vehicle being driven (affects which zones are reachable/suitable)'),
});

export const driverProfitabilitySummarySchema = z.object({
  tripsCompleted: z.number().int().min(0).describe('Number of trips completed'),
  totalRevenue: z.number().min(0).describe('Total fare revenue collected across all trips, in INR'),
  totalDistance: z.number().min(0).describe('Total distance driven across all trips, in km'),
  fuelCost: z.number().min(0).describe('Total fuel cost incurred, in INR'),
  hoursWorked: z.number().positive().optional().describe('Actual hours worked, if known (otherwise estimated from distance)'),
});

export const searchNearbyRidesSchema = z.object({
  currentLocation: z.string().describe('The driver\'s current location'),
  radiusKm: z.number().positive().max(15).optional().describe('Search radius in km (default 5)'),
});
