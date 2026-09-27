import mongoose, { Schema, type Model } from 'mongoose';

export interface PatientPreferenceEntity {
  patientId: string; // The user ID, could be phone or 'default'
  preferredCity?: string;
  preferredLanguage?: string;
  insuranceProvider?: string;
  updatedAt: Date;
}

const patientPreferenceSchema = new Schema<PatientPreferenceEntity>(
  {
    patientId: { type: String, required: true, unique: true, index: true },
    preferredCity: { type: String },
    preferredLanguage: { type: String },
    insuranceProvider: { type: String },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { collection: 'patient_preferences', versionKey: false },
);

export const PatientPreferenceModel: Model<PatientPreferenceEntity> =
  (mongoose.models.PatientPreference as Model<PatientPreferenceEntity> | undefined) ??
  mongoose.model<PatientPreferenceEntity>('PatientPreference', patientPreferenceSchema);
