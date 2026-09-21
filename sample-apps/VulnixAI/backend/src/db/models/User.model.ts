import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  githubId: number;
  username: string;
  email: string;
  name: string;
  avatarUrl: string;
  bio?: string;
  company?: string;
  location?: string;
  githubAccessToken?: string;
  firstLogin: Date;
  lastLogin: Date;
  lastActive: Date;
  loginCount: number;
  extra?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    githubId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      default: null,
    },
    company: {
      type: String,
      default: null,
    },
    location: {
      type: String,
      default: null,
    },
    githubAccessToken: {
      type: String,
      default: null,
      select: false, // Don't include in queries by default for security
    },
    firstLogin: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastActive: {
      type: Date,
      required: true,
      default: Date.now,
    },
    loginCount: {
      type: Number,
      default: 1,
    },
    extra: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
UserSchema.index({ lastActive: -1 });
UserSchema.index({ lastLogin: -1 });

export const User = mongoose.model<IUser>('User', UserSchema);
