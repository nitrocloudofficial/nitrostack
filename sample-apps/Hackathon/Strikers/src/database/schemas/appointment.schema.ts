import mongoose, { Schema, type Model } from 'mongoose';
import type { ConsultationMode } from './slot.schema.js';

export type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Checked In' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'Missed';

export interface AppointmentHistoryEntry {
  status: AppointmentStatus;
  timestamp: Date;
  note?: string;
}

/**
 * A booked consultation. Denormalises the doctor/hospital snapshot at booking
 * time so the confirmation widget can render without a second lookup and so
 * historical records survive directory edits.
 */
export interface AppointmentEntity {
  bookingId: string;
  status: AppointmentStatus;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorImageUrl: string;
  hospital: string;
  address: string;
  city: string;
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: ConsultationMode;
  patientName: string;
  patientPhone: string;
  patientAge?: number | null;
  reason?: string | null;
  fee: number;
  currency: string;
  createdAt: Date;
  history: AppointmentHistoryEntry[];
  cancelledAt?: Date | null;
  cancelReason?: string | null;
  slotReleased?: boolean;
}

const appointmentHistorySchema = new Schema<AppointmentHistoryEntry>(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: () => new Date() },
    note: { type: String },
  },
  { _id: false }
);

const appointmentSchema = new Schema<AppointmentEntity>(
  {
    bookingId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['Scheduled', 'Confirmed', 'Checked In', 'Completed', 'Cancelled', 'Rescheduled', 'Missed'],
      default: 'Confirmed',
    },
    doctorId: { type: String, required: true, index: true },
    doctorName: { type: String, required: true },
    doctorSpecialty: { type: String, required: true },
    doctorImageUrl: { type: String, required: true },
    hospital: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    slotId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    mode: { type: String, enum: ['in-person', 'video'], default: 'in-person' },
    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },
    patientAge: { type: Number, default: null },
    reason: { type: String, default: null },
    fee: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    createdAt: { type: Date, default: () => new Date() },
    history: { type: [appointmentHistorySchema], default: [] },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },
    slotReleased: { type: Boolean, default: false },
  },
  { collection: 'appointments', versionKey: false },
);

export const AppointmentModel: Model<AppointmentEntity> =
  (mongoose.models.Appointment as Model<AppointmentEntity> | undefined) ??
  mongoose.model<AppointmentEntity>('Appointment', appointmentSchema);
