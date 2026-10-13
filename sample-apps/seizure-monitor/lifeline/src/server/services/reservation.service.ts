import { Injectable } from '@nitrostack/core';
import { v4 as uuidv4 } from 'uuid';
import { EmergencyReservationInput, EmergencyReservationResult, Reservation, BedType } from '../interfaces/index.js';
import { HospitalService } from './hospital.service.js';
import { IdGenerator } from '../utils/id.generator.js';

/**
 * Reserves a bed ahead of patient arrival. Reservation records live in an
 * in-memory Map owned by this singleton (JSON mock database has no write
 * path of its own); HospitalService.decrementBed is the single point that
 * mutates bed counts, so availability stays consistent across tools.
 */
/** See RoutingService for why `deps` is required alongside the constructor type. */
@Injectable({ deps: [HospitalService] })
export class ReservationService {
  private readonly reservations = new Map<string, Reservation>();

  constructor(private readonly hospitalService: HospitalService) {}

  reserve(input: EmergencyReservationInput): EmergencyReservationResult {
    const hospital = this.hospitalService.getById(input.hospital_id);
    const bedType: BedType = input.bed_type ?? 'ER';

    this.hospitalService.decrementBed(input.hospital_id, bedType);

    const reservationId = `RES-${uuidv4()}`;
    const confirmationCode = IdGenerator.generateConfirmationCode();
    const reservedAt = new Date().toISOString();

    const reservation: Reservation = {
      reservation_id: reservationId,
      confirmation_code: confirmationCode,
      hospital_id: hospital.hospital_id,
      hospital_name: hospital.hospital_name,
      patient: {
        patient_id: IdGenerator.generateId('pat'),
        patient_name: input.patient_name,
        patient_age: input.patient_age,
      },
      bed_type: bedType,
      status: 'CONFIRMED',
      reserved_at: reservedAt,
      notes: input.notes,
    };

    this.reservations.set(reservationId, reservation);

    const availability = this.hospitalService.checkAvailability(hospital.hospital_id);
    const department = bedType === 'ICU' ? 'Intensive Care Unit' : 'Emergency Department';

    return {
      reservation_id: reservationId,
      confirmation_code: confirmationCode,
      status: reservation.status,
      hospital_id: hospital.hospital_id,
      hospital_name: hospital.hospital_name,
      hospital_phone_number: hospital.phone_number,
      patient_name: input.patient_name,
      bed_type: bedType,
      department,
      arrival_instructions: `Proceed immediately to the ${hospital.hospital_name} Emergency entrance. Present confirmation code ${confirmationCode} at registration for your reserved ${bedType} bed.`,
      reserved_at: reservedAt,
      remaining_er_beds: availability.er_beds_available,
      remaining_icu_beds: availability.icu_beds_available,
    };
  }
}
