/**
 * Appointment Booking (in-memory, no external database)
 *
 * Generates mock upcoming weekday slots for each doctor in the mock
 * registry (doctors.ts) and tracks which slots have been booked, all in
 * process memory — resets on server restart, consistent with the rest of
 * this project's "no external database" design.
 */

import { getDoctorsForSpecialty, getDoctorById } from './resources/doctors.js';

export interface AppointmentSlot {
  doctorId: string;
  doctorName: string;
  specialist: string;
  slot: string;
}

export interface PatientDetails {
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
}

export interface BookingRecord {
  confirmationId: string;
  doctorId: string;
  doctorName: string;
  specialist: string;
  slot: string;
  patientId: string;
  reason: string;
  patient: PatientDetails;
  bookedAt: string;
}

const SLOT_HOURS = [10, 15];
const WEEKDAYS_AHEAD = 5;

const bookedSlotKeys = new Set<string>();
const bookings: BookingRecord[] = [];

function slotKey(doctorId: string, slot: string): string {
  return `${doctorId}|${slot}`;
}

/**
 * Next N weekday dates (skipping Sat/Sun), each with a fixed set of time
 * slots. Regenerated on every call so slots always look like "the next
 * few business days" relative to whenever the server is asked.
 */
function generateUpcomingSlots(): string[] {
  const slots: string[] = [];
  const now = new Date();
  let weekdaysFound = 0;
  let dayOffset = 1;

  while (weekdaysFound < WEEKDAYS_AHEAD) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    const dayOfWeek = day.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      for (const hour of SLOT_HOURS) {
        const slot = new Date(day);
        slot.setHours(hour, 0, 0, 0);
        slots.push(slot.toISOString());
      }
      weekdaysFound++;
    }
    dayOffset++;
  }

  return slots;
}

/**
 * List open slots across every mock doctor of the given specialty.
 */
export function getAvailableSlots(specialist: string): AppointmentSlot[] {
  const doctors = getDoctorsForSpecialty(specialist);
  const available: AppointmentSlot[] = [];

  for (const doctor of doctors) {
    for (const slot of generateUpcomingSlots()) {
      if (!bookedSlotKeys.has(slotKey(doctor.doctorId, slot))) {
        available.push({ doctorId: doctor.doctorId, doctorName: doctor.doctorName, specialist: doctor.specialist, slot });
      }
    }
  }

  return available;
}

/**
 * Confirm a booking for a specific doctor + slot. Throws if the doctor is
 * unknown or the slot has already been taken (surfaces as a tool error).
 */
export function bookAppointment(
  doctorId: string,
  slot: string,
  patientId: string,
  reason: string,
  patient: PatientDetails
): BookingRecord {
  const doctor = getDoctorById(doctorId);
  if (!doctor) {
    throw new Error(`Unknown doctorId: ${doctorId}`);
  }

  if (!patient.name.trim()) {
    throw new Error('Patient name is required to book an appointment.');
  }

  const key = slotKey(doctorId, slot);
  if (bookedSlotKeys.has(key)) {
    throw new Error('That slot is no longer available. Please choose another from get_available_slots.');
  }

  bookedSlotKeys.add(key);

  const record: BookingRecord = {
    confirmationId: `appt_${Math.random().toString(36).slice(2, 10)}`,
    doctorId,
    doctorName: doctor.doctorName,
    specialist: doctor.specialist,
    slot,
    patientId,
    reason,
    patient,
    bookedAt: new Date().toISOString()
  };

  bookings.push(record);
  return record;
}

export function getBookingsForPatient(patientId: string): BookingRecord[] {
  return bookings.filter((b) => b.patientId === patientId);
}
