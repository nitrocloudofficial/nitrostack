/**
 * RIVA (Ride Intelligence & Virtual Assistance) — Domain Types
 *
 * Phase 1: rider-side types — ride discovery, comparison, recommendation,
 * preferences, nearby-driver visualization, and return-fare forecasting.
 * Phase 2: driver-side types — trip profitability, demand estimation, and
 * zone recommendation (advisory only; no bookings or real accounts).
 */

export type ProviderId = 'uber' | 'ola' | 'rapido';

export type VehicleType = 'bike' | 'auto' | 'mini' | 'sedan' | 'suv';

export type RankingMode = 'cheapest' | 'fastest' | 'instant_pickup' | 'best_value';

export interface LatLng {
  lat: number;
  lng: number;
}

/** A location as resolved (or estimated) by the geocoding layer. */
export interface ResolvedLocation {
  query: string;
  formattedAddress: string;
  coordinates: LatLng;
  /** Whether this came from a live Geoapify lookup or a deterministic estimate. */
  source: 'live' | 'estimated';
  /** Geoapify place_id, when resolved live — useful for exact re-lookup / disambiguation. */
  placeId?: string;
  /** Present only for estimated locations, explaining why live geocoding wasn't used. */
  estimationNote?: string;
  /**
   * Place photo URL, when available. Currently always undefined — Geoapify
   * (unlike Google Places) does not offer a place-photos API, so this field
   * is kept for forward compatibility but is not populated by MapsService.
   */
  photoUrl?: string;
}

/** Route information between two resolved locations. */
export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
  source: 'live' | 'estimated';
  staticMapUrl?: string;
  /** Route geometry as [lng, lat] coordinate pairs from Geoapify Routing, used to draw the path on the static map. */
  polyline?: Array<[number, number]>;
}

export interface RiderPreferences {
  femaleDriverOnly?: boolean;
  budgetLimit?: number;
  luggageRequired?: boolean;
  excludeVehicleTypes?: VehicleType[];
}

/** A single, normalized ride option — the common shape every provider adapter must return. */
export interface RideOption {
  optionId: string;
  provider: ProviderId;
  providerName: string;
  vehicleType: VehicleType;
  fare: number;
  currency: 'INR';
  pickupEtaMinutes: number;
  tripDurationMinutes: number;
  distanceKm: number;
  availability: boolean;
  isSimulated: boolean;
  rating: number;
  hasFemaleDriverOption: boolean;
  luggageFriendly: boolean;
  surgeMultiplier: number;
  dataSource: string;
  notes?: string;
}

export interface RankedRideOption extends RideOption {
  rank: number;
  score: number;
  scoreReason: string;
}

export interface RideSearchContext {
  origin: ResolvedLocation;
  destination: ResolvedLocation;
  route: RouteInfo;
  preferences: RiderPreferences;
}

/** Adapter contract every provider (mock or hybrid) must implement. */
export interface RideProviderAdapter {
  readonly providerId: ProviderId;
  readonly providerName: string;
  getRideOptions(context: RideSearchContext): Promise<RideOption[]>;
}

export interface NearbyDriver {
  driverId: string;
  provider: ProviderId;
  providerName: string;
  vehicleType: VehicleType;
  coordinates: LatLng;
  etaMinutes: number;
  rating: number;
  isFemaleDriver: boolean;
}

/** Persisted state for a single find_rides search, keyed by searchId. */
export interface RideSearchState {
  searchId: string;
  createdAt: number;
  origin: ResolvedLocation;
  destination: ResolvedLocation;
  route: RouteInfo;
  preferences: RiderPreferences;
  options: RideOption[];
  rankingMode: RankingMode;
}

// =====================================================================
// Phase 2 — Driver Intelligence Module
//
// Reuses ProviderId, VehicleType, LatLng, and ResolvedLocation above.
// The driver side is advisory only — no bookings, no real driver
// accounts, no persistence beyond the process lifetime.
// =====================================================================

export type UserMode = 'rider' | 'driver';

export type FuelType = 'petrol' | 'diesel' | 'cng' | 'electric';

export type DemandLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type TripRecommendation = 'ACCEPT' | 'CONSIDER' | 'REJECT';

export interface DriverTripInput {
  provider: ProviderId;
  offeredFare: number;
  tripDistance: number;
  pickupDistance: number;
  vehicleType: VehicleType;
  fuelType: FuelType;
  currentLocation: string;
  destination: string;
}

/** Transparent, itemized cost/earning breakdown for one prospective trip. */
export interface TripProfitabilityBreakdown {
  grossEarning: number;
  fuelCost: number;
  fuelCostExplanation: string;
  platformCommission: number;
  platformCommissionRate: number;
  netEarning: number;
  costPerKm: number;
  estimatedTripMinutes: number;
  estimatedHourlyEarning: number;
}

export interface DestinationAttractiveness {
  demandLevel: DemandLevel;
  returnProbability: number;
  explanation: string;
}

export interface DriverTripAnalysis {
  provider: ProviderId;
  vehicleType: VehicleType;
  currentLocation: ResolvedLocation;
  destination: ResolvedLocation;
  totalDistanceKm: number;
  breakdown: TripProfitabilityBreakdown;
  destinationAttractiveness: DestinationAttractiveness;
  recommendation: TripRecommendation;
  reason: string;
}

export interface DemandZoneProfile {
  zoneKey: string;
  displayName: string;
  coordinates: LatLng;
  category: 'airport' | 'railway' | 'commercial' | 'residential' | 'it_park' | 'college';
}

export interface DestinationDemand {
  destination: ResolvedLocation;
  matchedZone: string | null;
  time: string;
  demandLevel: DemandLevel;
  expectedRideAvailability: 'PLENTY' | 'MODERATE' | 'SCARCE';
  expectedWaitingMinutes: number;
  returnProbability: number;
  explanation: string;
}

export interface DriverZoneRecommendation {
  zoneName: string;
  coordinates: LatLng;
  distanceFromCurrentKm: number;
  demandLevel: DemandLevel;
  demandScore: number;
  reasoning: string;
}

export interface DriverEarningsInput {
  tripsCompleted: number;
  totalRevenue: number;
  totalDistance: number;
  fuelCost: number;
  /** Optional — if omitted, hours worked is estimated from distance + per-trip overhead. */
  hoursWorked?: number;
}

export interface DriverProfitabilitySummary {
  totalEarnings: number;
  expenses: {
    fuelCost: number;
    estimatedPlatformCommission: number;
    total: number;
  };
  netProfit: number;
  estimatedHoursWorked: number;
  hoursWorkedIsEstimated: boolean;
  averageEarningPerHour: number;
  averageEarningPerTrip: number;
  averageEarningPerKm: number;
  recommendations: string[];
}

// =====================================================================
// Phase 3 — Intelligent Mobility Copilot
//
// Travel concierge, traffic-aware planning, ride-later forecasting,
// multi-stop trips, pooling simulation, booking lifecycle simulation,
// SOS safety simulation, and the driver-side nearby ride marketplace.
// All advisory / simulated — no real bookings, payments, or emergency
// service integration.
// =====================================================================

export interface TravelPlan {
  origin: ResolvedLocation;
  destination: ResolvedLocation;
  arriveByLabel: string;
  arriveByHour: number;
  recommendedPickupLabel: string;
  bufferMinutes: number;
  bufferReason: string;
  trafficAdjustedTravelMinutes: number;
  trafficMultiplier: number;
  route: RouteInfo;
  recommendation: RankedRideOption | null;
  recommendationReason: string;
  alternatives: RankedRideOption[];
}

export interface RideLaterForecast {
  origin: ResolvedLocation;
  destination: ResolvedLocation;
  targetTimeLabel: string;
  currentFare: number | null;
  forecastFareLow: number | null;
  forecastFareHigh: number | null;
  demandMultiplier: number;
  expectedAvailability: 'PLENTY' | 'MODERATE' | 'SCARCE';
  reason: string;
  disclaimer: string;
}

export interface MultiStopLeg {
  from: string;
  to: string;
  distanceKm: number;
  durationMinutes: number;
  fare: number;
}

export interface MultiStopPlan {
  stops: ResolvedLocation[];
  legs: MultiStopLeg[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  estimatedFare: number;
  routeDisplay: string;
}

export interface PoolingMatch {
  matchedRiderDestination: string;
  routeOverlapPercent: number;
  savingsInr: number;
  extraMinutes: number;
}

export interface PoolingAnalysis {
  origin: ResolvedLocation;
  destination: ResolvedLocation;
  soloFare: number;
  bestMatch: PoolingMatch | null;
  otherMatches: PoolingMatch[];
  recommendation: 'POOL' | 'DO_NOT_POOL';
  reason: string;
}

export type BookingStatus = 'PENDING_CONFIRMATION' | 'SEARCHING' | 'DRIVER_ASSIGNED' | 'DRIVER_ARRIVING' | 'TRIP_STARTED' | 'COMPLETED' | 'CANCELLED';

export interface SimulatedDriverInfo {
  driverName: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  rating: number;
  etaMinutes: number;
}

export interface Booking {
  bookingId: string;
  createdAt: number;
  searchId: string;
  optionId: string;
  provider: ProviderId;
  vehicleType: VehicleType;
  fare: number;
  origin: ResolvedLocation;
  destination: ResolvedLocation;
  status: BookingStatus;
  driver: SimulatedDriverInfo | null;
  statusHistory: Array<{ status: BookingStatus; at: number }>;
}

export interface SosAlert {
  timestamp: number;
  currentLocation: ResolvedLocation;
  bookingId: string | null;
  contactsNotified: string[];
  locationShared: boolean;
  tripDetailsShared: boolean;
  message: string;
  disclaimer: string;
}

export interface NearbyRideRequest {
  requestId: string;
  provider: ProviderId;
  pickupZone: string;
  pickupDistanceKm: number;
  dropZone: string;
  tripDistanceKm: number;
  fare: number;
  estimatedNetEarning: number;
}
