import mongoose, { Schema, type Model } from 'mongoose';

export type SlotStatus = 'available' | 'booked';
export type ConsultationMode = 'in-person' | 'video';

/**
 * A single bookable consultation window for one doctor on one calendar day.
 * Dates are stored as ISO calendar strings (`YYYY-MM-DD`) and times as 24h
 * `HH:mm` so slot comparison is a pure string comparison — no timezone drift.
 */
export interface SlotEntity {
  slotId: string;
  doctorId: string;
  /** ISO calendar date, e.g. "2026-07-28". */
  date: string;
  /** 24h start time, e.g. "17:00". */
  startTime: string;
  /** 24h end time, e.g. "17:30". */
  endTime: string;
  mode: ConsultationMode;
  status: SlotStatus;
  fee: number;
  /** Populated when the slot is booked. */
  bookingId?: string | null;
}

const slotSchema = new Schema<SlotEntity>(
  {
    slotId: { type: String, required: true, unique: true, index: true },
    doctorId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    mode: { type: String, enum: ['in-person', 'video'], default: 'in-person' },
    status: { type: String, enum: ['available', 'booked'], default: 'available', index: true },
    fee: { type: Number, required: true },
    bookingId: { type: String, default: null },
  },
  { collection: 'slots', versionKey: false },
);

slotSchema.index({ doctorId: 1, date: 1, startTime: 1 });

export const SlotModel: Model<SlotEntity> =
  (mongoose.models.Slot as Model<SlotEntity> | undefined) ??
  mongoose.model<SlotEntity>('Slot', slotSchema);
