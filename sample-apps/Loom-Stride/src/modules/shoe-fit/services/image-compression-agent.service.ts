import { Injectable } from '@nitrostack/core';
import sharp from 'sharp';
import { decodeBase64File } from '../../../common/file.utils.js';

export interface CompressionResult {
  buffer: Buffer;
  base64: string;
  mimeType: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  wasCompressed: boolean;
  dimensions: { width?: number; height?: number };
}

@Injectable()
export class ImageCompressionAgentService {
  private readonly TARGET_MAX_DIMENSION = 1280;
  private readonly TARGET_MAX_BYTES = 500 * 1024; // 500 KB target threshold

  async compressBase64ImageIfNeeded(base64Content: string, mimeType = 'image/jpeg'): Promise<CompressionResult> {
    const rawBuffer = decodeBase64File(base64Content);
    return this.compressBufferIfNeeded(rawBuffer, mimeType);
  }

  async compressBufferIfNeeded(buffer: Buffer, mimeType = 'image/jpeg'): Promise<CompressionResult> {
    const originalSizeKb = Math.round(buffer.length / 1024);

    try {
      let currentBuffer = buffer;
      let metadata = await sharp(currentBuffer).metadata();
      let wasCompressed = false;

      // Pass 1: Resize if width/height > 1280px or size > 500KB + contrast boost
      if (
        buffer.length > this.TARGET_MAX_BYTES ||
        (metadata.width && metadata.width > this.TARGET_MAX_DIMENSION) ||
        (metadata.height && metadata.height > this.TARGET_MAX_DIMENSION)
      ) {
        currentBuffer = await sharp(buffer)
          .normalize() // Adaptive contrast normalization
          .sharpen() // Edge clarity sharpening
          .resize({
            width: this.TARGET_MAX_DIMENSION,
            height: this.TARGET_MAX_DIMENSION,
            fit: 'inside', // Maintains exact 1:1 pixel aspect ratio for mm scale accuracy
            withoutEnlargement: true,
          })
          .jpeg({ quality: 75, progressive: true })
          .toBuffer();
        wasCompressed = true;
      }

      // Pass 2: Aggressive fallback if still over 500KB
      if (currentBuffer.length > this.TARGET_MAX_BYTES) {
        currentBuffer = await sharp(currentBuffer)
          .normalize()
          .resize({
            width: 1024,
            height: 1024,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 60 })
          .toBuffer();
        wasCompressed = true;
      }

      const compressedSizeKb = Math.round(currentBuffer.length / 1024);
      const finalMetadata = await sharp(currentBuffer).metadata();

      return {
        buffer: currentBuffer,
        base64: currentBuffer.toString('base64'),
        mimeType: 'image/jpeg',
        originalSizeKb,
        compressedSizeKb,
        wasCompressed,
        dimensions: { width: finalMetadata.width, height: finalMetadata.height },
      };
    } catch {
      return {
        buffer,
        base64: buffer.toString('base64'),
        mimeType,
        originalSizeKb,
        compressedSizeKb: originalSizeKb,
        wasCompressed: false,
        dimensions: {},
      };
    }
  }
}
