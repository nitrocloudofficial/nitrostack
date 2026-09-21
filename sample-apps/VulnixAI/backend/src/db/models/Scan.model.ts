import mongoose, { Schema, Document } from 'mongoose';

export type ScanStatus = 'queued' | 'scanning' | 'completed' | 'failed';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface IVulnerability {
  id: string;
  title: string;
  severity: Severity;
  scanner: string;
  file: string;
  line: number;
  description: string;
  cweId: string;
  fixAvailable: boolean;
  originalCode: string;
  patchedCode: string;
}

export interface IScan extends Document {
  userId: number;
  repoId: string;
  repoName: string;
  repoFullName: string;
  repoUrl: string;
  defaultBranch: string;
  status: ScanStatus;
  startedAt: Date;
  completedAt?: Date;
  vulnerabilities: IVulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
    patchable: number;
  };
  logs: Array<{
    time: Date;
    message: string;
    level: 'info' | 'success' | 'warning' | 'error';
  }>;
  error?: string;
  prInfo?: {
    prNumber: number;
    prUrl: string;
    createdAt: Date;
    status: 'open' | 'closed' | 'merged';
  };
  createdAt: Date;
  updatedAt: Date;
}

const VulnerabilitySchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true },
  scanner: { type: String, required: true },
  file: { type: String, required: true },
  line: { type: Number, required: true },
  description: { type: String, required: true },
  cweId: { type: String, required: true },
  fixAvailable: { type: Boolean, default: false },
  originalCode: { type: String, required: true },
  patchedCode: { type: String, required: true },
}, { _id: false });

const ScanSchema = new Schema<IScan>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    repoId: {
      type: String,
      required: true,
      index: true,
    },
    repoName: {
      type: String,
      required: true,
    },
    repoFullName: {
      type: String,
      required: true,
    },
    repoUrl: {
      type: String,
      required: true,
    },
    defaultBranch: {
      type: String,
      default: 'main',
    },
    status: {
      type: String,
      enum: ['queued', 'scanning', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    vulnerabilities: {
      type: [VulnerabilitySchema],
      default: [],
    },
    summary: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      patchable: { type: Number, default: 0 },
    },
    logs: {
      type: [{
        time: { type: Date, required: true },
        message: { type: String, required: true },
        level: { type: String, enum: ['info', 'success', 'warning', 'error'], required: true },
      }],
      default: [],
    },
    error: {
      type: String,
    },
    prInfo: {
      prNumber: { type: Number },
      prUrl: { type: String },
      createdAt: { type: Date },
      status: { type: String, enum: ['open', 'closed', 'merged'] },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ScanSchema.index({ userId: 1, createdAt: -1 });
ScanSchema.index({ status: 1, createdAt: -1 });

export const Scan = mongoose.model<IScan>('Scan', ScanSchema);
