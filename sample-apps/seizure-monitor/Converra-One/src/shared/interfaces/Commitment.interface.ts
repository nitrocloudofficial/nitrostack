import { PlatformType } from '../enums/platform.enum.js';

export interface Commitment {
  id: string;
  sourceMessageId: string;
  sourcePlatform: PlatformType;
  committedBy: string;
  committedTo: string;
  statement: string; // The extracted promise/commitment text
  dueDate?: Date;
  isFulfilled: boolean;
  detectedAt: Date;
}
