import mongoose, { Schema, type Model } from 'mongoose';

export interface LabTestEntity {
  testId: string;
  name: string;
  category?: string;
  price: number;
  turnaroundHours?: number;
  preparationInstructions?: string;
  collectionStatus: 'Pending' | 'Collected' | 'In-Progress' | 'Completed';
  reportStatus: 'Pending' | 'Ready' | 'Delivered';
  expectedDelivery: Date;
}

const labTestSchema = new Schema<LabTestEntity>(
  {
    testId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    category: { type: String },
    price: { type: Number, required: true },
    turnaroundHours: { type: Number },
    preparationInstructions: { type: String },
    collectionStatus: { type: String, enum: ['Pending', 'Collected', 'In-Progress', 'Completed'], default: 'Pending' },
    reportStatus: { type: String, enum: ['Pending', 'Ready', 'Delivered'], default: 'Pending' },
    expectedDelivery: { type: Date },
  },
  { collection: 'lab_tests', versionKey: false },
);

// H3, H7: Text index for name search + compound index for status queries
labTestSchema.index({ name: 'text', category: 'text' });
labTestSchema.index({ testId: 1, reportStatus: 1 });

export const LabTestModel: Model<LabTestEntity> =
  (mongoose.models.LabTest as Model<LabTestEntity> | undefined) ??
  mongoose.model<LabTestEntity>('LabTest', labTestSchema);

