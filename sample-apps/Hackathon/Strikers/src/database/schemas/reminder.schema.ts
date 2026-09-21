import mongoose, { Schema, type Model } from 'mongoose';

export type ReminderType = '1-day' | '1-hour' | 'follow-up';
export type ReminderStatus = 'pending' | 'sent' | 'cancelled';

export interface ReminderEntity {
  reminderId: string;
  bookingId: string;
  patientId?: string;
  type: ReminderType;
  scheduledAt: Date;
  status: ReminderStatus;
  createdAt: Date;
}

const reminderSchema = new Schema<ReminderEntity>(
  {
    reminderId: { type: String, required: true, unique: true, index: true },
    bookingId: { type: String, required: true, index: true },
    patientId: { type: String, index: true },
    type: { type: String, enum: ['1-day', '1-hour', 'follow-up'], required: true },
    scheduledAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'sent', 'cancelled'], default: 'pending', index: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: 'reminders', versionKey: false },
);

export const ReminderModel: Model<ReminderEntity> =
  (mongoose.models.Reminder as Model<ReminderEntity> | undefined) ??
  mongoose.model<ReminderEntity>('Reminder', reminderSchema);
