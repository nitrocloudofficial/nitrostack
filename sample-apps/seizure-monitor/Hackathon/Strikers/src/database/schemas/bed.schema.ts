import mongoose, { Schema, type Model } from 'mongoose';

export type BedType = 'ICU' | 'General' | 'Emergency' | 'Private' | 'Semi-private';
export type BedStatus = 'Occupied' | 'Available' | 'Reserved' | 'Maintenance';

export interface BedEntity {
  bedId: string;
  hospital: string;
  type: BedType;
  status: BedStatus;
  lastUpdated: Date;
}

const bedSchema = new Schema<BedEntity>(
  {
    bedId: { type: String, required: true, unique: true, index: true },
    hospital: { type: String, required: true, index: true },
    type: { type: String, enum: ['ICU', 'General', 'Emergency', 'Private', 'Semi-private'], required: true },
    status: { type: String, enum: ['Occupied', 'Available', 'Reserved', 'Maintenance'], required: true },
    lastUpdated: { type: Date, default: () => new Date() },
  },
  { collection: 'beds', versionKey: false },
);

export const BedModel: Model<BedEntity> =
  (mongoose.models.Bed as Model<BedEntity> | undefined) ??
  mongoose.model<BedEntity>('Bed', bedSchema);
