import { Injectable } from '@nitrostack/core';
import type { Logger } from '@nitrostack/core';
import { MapsService } from '../../services/maps.service.js';
import { BookingService } from './booking.service.js';
import type { SosAlert } from '../../domain/types.js';

const SIMULATED_CONTACTS = ['Primary Emergency Contact', 'Secondary Emergency Contact'];

/**
 * SafetyService
 *
 * SIMULATION ONLY. This does not send any real notification, does not
 * contact real emergency services, and does not share real location data
 * with anyone. It exists to demonstrate what an in-app SOS UX would look
 * like. Every response carries an explicit disclaimer directing the user
 * to call real emergency services (112 in India) if they are in genuine
 * danger.
 */
@Injectable({ deps: [MapsService, BookingService] })
export class SafetyService {
  constructor(
    private readonly maps: MapsService,
    private readonly booking: BookingService
  ) {}

  async triggerSos(currentLocationQuery: string, bookingId: string | undefined, note: string | undefined, logger?: Logger): Promise<SosAlert> {
    const currentLocation = await this.maps.resolveLocation(currentLocationQuery, logger);
    const trip = bookingId ? this.booking.getBooking(bookingId) : undefined;

    const tripDetailsShared = Boolean(trip);
    const message = trip
      ? `Simulated alert sent: your location and trip details (${trip.provider} ${trip.vehicleType}, ${trip.origin.formattedAddress} → ${trip.destination.formattedAddress}) were shared with your emergency contacts.${note ? ` Note: "${note}"` : ''}`
      : `Simulated alert sent: your current location was shared with your emergency contacts.${note ? ` Note: "${note}"` : ''}`;

    return {
      timestamp: Date.now(),
      currentLocation,
      bookingId: bookingId ?? null,
      contactsNotified: SIMULATED_CONTACTS,
      locationShared: true,
      tripDetailsShared,
      message,
      disclaimer:
        'This is a SIMULATED safety feature for demo purposes only — no real notification was sent and no real emergency service was contacted. If you are in genuine danger, call your local emergency number immediately (112 in India).',
    };
  }
}
