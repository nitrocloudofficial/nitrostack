import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'crypto';
import { createSeededRandom, hashString, pick, randomBetween } from '../../services/sim.util.js';
import type { Booking, BookingStatus, RankedRideOption, ResolvedLocation, SimulatedDriverInfo } from '../../domain/types.js';

const DRIVER_NAMES = ['Karthik', 'Suresh', 'Muthu', 'Anitha', 'Priya', 'Rajesh', 'Vignesh', 'Lakshmi', 'Saravanan', 'Divya'];

/** Ordered lifecycle — advanceBooking() moves one step at a time through this list. */
const LIFECYCLE: BookingStatus[] = ['SEARCHING', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'TRIP_STARTED', 'COMPLETED'];

const TTL_MS = 30 * 60 * 1000;

/**
 * BookingService
 *
 * Simulates a booking lifecycle end to end (Searching → Driver Assigned →
 * Driver Arriving → Trip Started → Completed). This is a Phase 1-scope-
 * respecting simulation — no real booking, payment, or dispatch system —
 * and per the plan, a booking is NEVER created without an explicit
 * `confirmed: true` from the caller.
 *
 * Each call with an existing bookingId advances the lifecycle by exactly
 * one stage, so a client can poll/re-call to watch the trip progress —
 * there's no real-time backend, so "time passing" is modeled as "the tool
 * was called again."
 */
@Injectable()
export class BookingService {
  private store = new Map<string, Booking>();

  createBooking(searchId: string, optionId: string, option: RankedRideOption, origin: ResolvedLocation, destination: ResolvedLocation): Booking {
    this.evictExpired();

    const bookingId = randomUUID();
    const now = Date.now();

    const booking: Booking = {
      bookingId,
      createdAt: now,
      searchId,
      optionId,
      provider: option.provider,
      vehicleType: option.vehicleType,
      fare: option.fare,
      origin,
      destination,
      status: 'SEARCHING',
      driver: null,
      statusHistory: [{ status: 'SEARCHING', at: now }],
    };

    this.store.set(bookingId, booking);

    // "Searching" resolves instantly in a demo — immediately advance to
    // Driver Assigned so the caller gets a concrete driver right away.
    return this.advanceBooking(bookingId)!;
  }

  getBooking(bookingId: string): Booking | undefined {
    this.evictExpired();
    return this.store.get(bookingId);
  }

  /** Moves a booking exactly one step forward in the lifecycle. Idempotent once COMPLETED/CANCELLED. */
  advanceBooking(bookingId: string): Booking | undefined {
    const booking = this.store.get(bookingId);
    if (!booking) return undefined;

    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      return booking;
    }

    const currentIndex = LIFECYCLE.indexOf(booking.status);
    const nextStatus = LIFECYCLE[Math.min(currentIndex + 1, LIFECYCLE.length - 1)];

    booking.status = nextStatus;
    booking.statusHistory.push({ status: nextStatus, at: Date.now() });

    if (nextStatus === 'DRIVER_ASSIGNED' && !booking.driver) {
      booking.driver = this.generateDriver(bookingId, booking.vehicleType);
    }
    if (nextStatus === 'DRIVER_ARRIVING' && booking.driver) {
      booking.driver = { ...booking.driver, etaMinutes: Math.max(1, booking.driver.etaMinutes - 2) };
    }

    this.store.set(bookingId, booking);
    return booking;
  }

  private generateDriver(seedKey: string, vehicleType: Booking['vehicleType']): SimulatedDriverInfo {
    const rng = createSeededRandom(hashString(`driver|${seedKey}`));
    const driverName = pick(rng, DRIVER_NAMES);
    const plateState = pick(rng, ['TN 37', 'TN 66', 'KL 07']);
    const plateLetters = String.fromCharCode(65 + Math.floor(randomBetween(rng, 0, 26))) + String.fromCharCode(65 + Math.floor(randomBetween(rng, 0, 26)));
    const plateNumber = Math.floor(randomBetween(rng, 1000, 9999));

    return {
      driverName,
      vehicleType,
      vehicleNumber: `${plateState} ${plateLetters} ${plateNumber}`,
      rating: Math.round(randomBetween(rng, 4.2, 4.9) * 10) / 10,
      etaMinutes: Math.round(randomBetween(rng, 3, 9)),
    };
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now - value.createdAt > TTL_MS) {
        this.store.delete(key);
      }
    }
  }
}
