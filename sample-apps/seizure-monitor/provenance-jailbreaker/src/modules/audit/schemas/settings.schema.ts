import mongoose, { Schema, model, type Document } from 'mongoose';

export interface AppSettingsDocument extends Document {
  logRetentionDays: number;
}

const AppSettingsSchema = new Schema<AppSettingsDocument>(
  {
    logRetentionDays: { type: Number, default: 7 }
  },
  {
    collection: 'app_settings',
    versionKey: false
  }
);

export const AppSettingsModel = mongoose.models?.AppSettings || model<AppSettingsDocument>('AppSettings', AppSettingsSchema);
