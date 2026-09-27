import mongoose, { Schema, Document } from 'mongoose';

export interface IPenetrationTest extends Document {
  userId: number;
  url: string;
  testDate: Date;
  results: Array<{
    testName: string;
    category: string;
    passed: boolean;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    description: string;
    evidence?: string;
    payload?: string;
    recommendation?: string;
  }>;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PenetrationTestSchema = new Schema<IPenetrationTest>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    testDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    results: [
      {
        testName: String,
        category: String,
        passed: Boolean,
        severity: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low', 'info'],
        },
        description: String,
        evidence: String,
        payload: String,
        recommendation: String,
      },
    ],
    summary: {
      totalTests: Number,
      passed: Number,
      failed: Number,
      critical: Number,
      high: Number,
      medium: Number,
      low: Number,
    },
  },
  {
    timestamps: true,
  }
);

PenetrationTestSchema.index({ userId: 1, testDate: -1 });
PenetrationTestSchema.index({ url: 1, testDate: -1 });

export const PenetrationTest = mongoose.model<IPenetrationTest>('PenetrationTest', PenetrationTestSchema);
