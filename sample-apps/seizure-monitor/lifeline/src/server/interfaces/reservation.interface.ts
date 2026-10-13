import { Patient } from './patient.interface.js';

export type BedType = 'ICU' | 'ER';
export type ReservationStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'EXPIRED';

export interface EmergencyReservationInput {
  hospital_id: string;
  patient_name: string;
  bed_type?: BedType;
  patient_age?: number;
  notes?: string;
}

export interface EmergencyReservationResult {
  reservation_id: string;
  confirmation_code: string;
  status: ReservationStatus;
  hospital_id: string;
  hospital_name: string;
  hospital_phone_number: string;
  patient_name: string;
  bed_type: BedType;
  department: string;
  arrival_instructions: string;
  reserved_at: string;
  remaining_er_beds: number;
  remaining_icu_beds: number;
}

/**
 * Internal stored reservation entity, owned exclusively by ReservationService.
 */
export interface Reservation {
  reservation_id: string;
  confirmation_code: string;
  hospital_id: string;
  hospital_name: string;
  patient: Patient;
  bed_type: BedType;
  status: ReservationStatus;
  reserved_at: string;
  notes?: string;
}
