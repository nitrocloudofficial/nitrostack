import mongoose, { Schema, type Model } from 'mongoose';

export interface IncidentEntity {
  incidentId: string;
  condition: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Active' | 'Resolved' | 'Escalated';
  reportedAt: Date;
  hospital: string;
}

const incidentSchema = new Schema<IncidentEntity>(
  {
    incidentId: { type: String, required: true, unique: true, index: true },
    condition: { type: String, required: true },
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true },
    status: { type: String, enum: ['Active', 'Resolved', 'Escalated'], default: 'Active' },
    reportedAt: { type: Date, default: () => new Date() },
    hospital: { type: String, required: true },
  },
  { collection: 'incidents', versionKey: false },
);

export const IncidentModel: Model<IncidentEntity> =
  (mongoose.models.Incident as Model<IncidentEntity> | undefined) ??
  mongoose.model<IncidentEntity>('Incident', incidentSchema);
