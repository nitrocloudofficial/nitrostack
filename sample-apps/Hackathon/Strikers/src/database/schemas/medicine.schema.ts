import mongoose, { Schema, type Model } from 'mongoose';

export interface MedicineEntity {
  medicineId: string;
  name: string;
  stock: number;
  stockLevel: number; // Normalized 0–100 stock percentage for alerts
  expiryDate: Date;
  availability: boolean;
  alternativeMedicines: string[];
  category?: string;
  dosageForm?: string;
  manufacturer?: string;
}

const medicineSchema = new Schema<MedicineEntity>(
  {
    medicineId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    stock: { type: Number, required: true },
    stockLevel: { type: Number, default: 100 }, // H3: used for low-stock alerts
    expiryDate: { type: Date, required: true },
    availability: { type: Boolean, required: true },
    alternativeMedicines: { type: [String], default: [] },
    category: { type: String },
    dosageForm: { type: String },
    manufacturer: { type: String },
  },
  { collection: 'medicines', versionKey: false },
);

// H3: Text index for faster name search across large catalog
medicineSchema.index({ name: 'text', category: 'text' });

export const MedicineModel: Model<MedicineEntity> =
  (mongoose.models.Medicine as Model<MedicineEntity> | undefined) ??
  mongoose.model<MedicineEntity>('Medicine', medicineSchema);
