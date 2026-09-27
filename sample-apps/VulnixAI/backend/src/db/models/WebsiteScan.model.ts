import mongoose, { Schema, Document } from 'mongoose';

export interface IVerifiedDomain extends Document {
  userId: number;
  domain: string;
  verificationToken: string;
  verificationMethod: 'file' | 'dns' | 'meta';
  verified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWebsiteScan extends Document {
  userId: number;
  url: string;
  scanDate: Date;
  vulnerabilities: Array<{
    type: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
    title: string;
    description: string;
    recommendation: string;
    evidence?: string;
  }>;
  securityScore: number;
  headers: Record<string, string>;
  technologies: string[];
  ssl: {
    valid: boolean;
    issuer?: string;
    validFrom?: Date;
    validTo?: Date;
    protocol?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const WebsiteScanSchema = new Schema<IWebsiteScan>(
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
    scanDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    vulnerabilities: [
      {
        type: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low', 'info'],
          required: true,
        },
        category: String,
        title: String,
        description: String,
        recommendation: String,
        evidence: String,
      },
    ],
    securityScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    headers: {
      type: Map,
      of: String,
    },
    technologies: [String],
    ssl: {
      valid: Boolean,
      issuer: String,
      validFrom: Date,
      validTo: Date,
      protocol: String,
    },
  },
  {
    timestamps: true,
  }
);

WebsiteScanSchema.index({ userId: 1, scanDate: -1 });
WebsiteScanSchema.index({ url: 1, scanDate: -1 });

const VerifiedDomainSchema = new Schema<IVerifiedDomain>(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    verificationToken: {
      type: String,
      required: true,
    },
    verificationMethod: {
      type: String,
      enum: ['file', 'dns', 'meta'],
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

VerifiedDomainSchema.index({ userId: 1, domain: 1 }, { unique: true });
VerifiedDomainSchema.index({ domain: 1, verified: 1 });

export const WebsiteScan = mongoose.model<IWebsiteScan>('WebsiteScan', WebsiteScanSchema);
export const VerifiedDomain = mongoose.model<IVerifiedDomain>('VerifiedDomain', VerifiedDomainSchema);
