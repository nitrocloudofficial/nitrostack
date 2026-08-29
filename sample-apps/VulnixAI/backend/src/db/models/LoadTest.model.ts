import mongoose, { Schema, Document } from 'mongoose';

export interface ILoadTest extends Document {
  userId: number;
  url: string;
  testDate: Date;
  config: {
    duration: number;
    concurrentUsers: number;
    requestsPerSecond: number;
  };
  results: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    requestsPerSecond: number;
    errors: Array<{
      statusCode: number;
      count: number;
      message: string;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LoadTestSchema = new Schema<ILoadTest>(
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
    config: {
      duration: Number,
      concurrentUsers: Number,
      requestsPerSecond: Number,
    },
    results: {
      totalRequests: Number,
      successfulRequests: Number,
      failedRequests: Number,
      averageResponseTime: Number,
      minResponseTime: Number,
      maxResponseTime: Number,
      requestsPerSecond: Number,
      errors: [
        {
          statusCode: Number,
          count: Number,
          message: String,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

LoadTestSchema.index({ userId: 1, testDate: -1 });
LoadTestSchema.index({ url: 1, testDate: -1 });

export const LoadTest = mongoose.model<ILoadTest>('LoadTest', LoadTestSchema);
