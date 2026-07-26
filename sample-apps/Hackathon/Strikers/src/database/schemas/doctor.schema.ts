import mongoose, { Schema, type Model } from 'mongoose';

/**
 * Doctor entity — a bookable clinician in the Arogya provider directory.
 *
 * `specialtySlug` is the normalised, lowercase form used for matching
 * free-text user queries ("cardiologist", "heart doctor") against the
 * directory. `imageUrl` is required because every doctor is rendered as an
 * image card in the `doctors` widget.
 */
export interface DoctorEntity {
  /** Stable public identifier (used by every tool + widget). */
  doctorId: string;
  name: string;
  /** Display specialty, e.g. "Cardiologist". */
  specialty: string;
  /** Normalised specialty key, e.g. "cardiology". */
  specialtySlug: string;
  /** Alternate spellings/synonyms accepted from user queries. */
  specialtyAliases: string[];
  city: string;
  hospital: string;
  address: string;
  qualifications: string;
  experienceYears: number;
  languages: string[];
  consultationFee: number;
  currency: string;
  rating: number;
  reviewCount: number;
  /** HTTPS portrait used by the doctors widget. */
  imageUrl: string;
  bio: string;
  /** Whether the doctor accepts insurance */
  acceptsInsurance: boolean;
  /** Distance in km from the patient (or static for MVP) */
  distance: number;
  /** Estimated waiting time in minutes at the clinic */
  estimatedWaitingTime: number;
}

const doctorSchema = new Schema<DoctorEntity>(
  {
    doctorId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    specialtySlug: { type: String, required: true, index: true },
    specialtyAliases: { type: [String], default: [] },
    city: { type: String, required: true, index: true },
    hospital: { type: String, required: true },
    address: { type: String, required: true },
    qualifications: { type: String, required: true },
    experienceYears: { type: Number, required: true },
    languages: { type: [String], default: [] },
    consultationFee: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    rating: { type: Number, required: true },
    reviewCount: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    bio: { type: String, default: '' },
    acceptsInsurance: { type: Boolean, default: false },
    distance: { type: Number, default: 0 },
    estimatedWaitingTime: { type: Number, default: 15 },
  },
  { collection: 'doctors', versionKey: false },
);

doctorSchema.index({
  name: 'text',
  specialty: 'text',
  hospital: 'text',
  specialtyAliases: 'text',
});

export const DoctorModel: Model<DoctorEntity> =
  (mongoose.models.Doctor as Model<DoctorEntity> | undefined) ??
  mongoose.model<DoctorEntity>('Doctor', doctorSchema);
