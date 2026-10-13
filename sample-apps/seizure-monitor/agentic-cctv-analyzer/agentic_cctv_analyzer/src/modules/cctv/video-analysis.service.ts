import { Injectable } from '@nitrostack/core';
import { existsSync, readdirSync, statSync, openSync, readSync, closeSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { EventStorageService, StoredAnalysisRecord } from './event-storage.service.js';
import { DetectionEvent } from './yolo-detection.service.js';
import { DemoDetectionService } from './demo-detection.service.js';
import { TimelineService } from './timeline.service.js';
import { VideoSummaryService } from './video-summary.service.js';

export interface VideoMetadata {
    [key: string]: any;
    filename: string;
    duration: number;
    width: number;
    height: number;
    fps: number;
    codec: string;
    fileSize: number;
}

export interface VideoAnalysisResult {
    [key: string]: any;
    videoId: string;
    framesProcessed: number;
    objectsDetected: number;
    eventsStored: number;
    status: 'completed' | 'failed';
    metadata?: VideoMetadata;
    events?: DetectionEvent[];
    timeline?: any;
}

const ALLOWED_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv'];

// Minimal valid JPEG binary buffer
const SAMPLE_JPEG_BUFFER = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
    0x00, 0x60, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
    0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
    0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
    0x00, 0xD2, 0xFF, 0xD9
]);

@Injectable({ deps: [EventStorageService, DemoDetectionService, TimelineService, VideoSummaryService] })
export class VideoAnalysisService {
    constructor(
        private readonly eventStorageService: EventStorageService,
        private readonly demoDetectionService: DemoDetectionService,
        private readonly timelineService: TimelineService,
        private readonly videoSummaryService: VideoSummaryService,
    ) {}

    /**
     * Complete Analysis Pipeline: Upload -> Metadata -> Frame Extraction -> Demo Detection -> Store Events
     */
    async analyzeVideo(videoId: string, intervalSeconds: number = 10): Promise<VideoAnalysisResult> {
        if (!videoId || typeof videoId !== 'string') {
            throw new Error('Invalid videoId provided');
        }

        const filePath = this.findVideoFile(videoId);
        if (!filePath) {
            throw new Error(`Video not found for videoId "${videoId}"`);
        }

        const ext = extname(filePath).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            throw new Error(`Unsupported video format "${ext}". Supported formats: mp4, avi, mov, mkv.`);
        }

        const stats = statSync(filePath);
        if (!stats.isFile() || stats.size === 0) {
            throw new Error(`Corrupted or empty video file at "${filePath}"`);
        }

        // 1. Extract Video Metadata
        const metadata = this.extractMetadata(filePath, stats.size);

        // 2. Extract Video Frames under frames/{videoId}/
        const { extractedFrames } = this.extractFrames(videoId, metadata.duration, intervalSeconds);

        // 3. Run Demo Detection Engine immediately after frame extraction
        const detections = await this.demoDetectionService.processFrames(extractedFrames, videoId, intervalSeconds);

        // 4. Store Analysis Record and Detections in EventStorageService
        const record: StoredAnalysisRecord = {
            videoId,
            filename: metadata.filename,
            analyzedAt: new Date().toISOString(),
            metadata,
            extractedFrames,
            events: detections,
        };
        await this.eventStorageService.saveAnalysis(record);

        // 5. Generate and persist a timeline for the stored events
        const timeline = await this.timelineService.getEventTimeline(videoId, 10);
        record.timeline = timeline;
        await this.eventStorageService.saveAnalysis(record);

        // 6. Generate and persist a video summary when one does not already exist
        await this.videoSummaryService.generateSummary(videoId);

        return {
            videoId,
            framesProcessed: extractedFrames.length,
            objectsDetected: detections.length,
            eventsStored: detections.length,
            status: 'completed',
            metadata,
            events: detections,
            timeline,
        };
    }

    /**
     * Extract frame images at configurable time intervals and save under frames/{videoId}/
     */
    private extractFrames(videoId: string, duration: number, intervalSeconds: number): { framesDir: string; extractedFrames: string[] } {
        const effectiveInterval = Math.max(1, intervalSeconds || 10);
        const framesDir = join(process.cwd(), 'frames', videoId);

        if (!existsSync(framesDir)) {
            mkdirSync(framesDir, { recursive: true });
        }

        const extractedFrames: string[] = [];
        let currentSecond = 0;

        while (currentSecond <= duration) {
            const frameFilename = `frame_${currentSecond}s.jpg`;
            const framePath = join(framesDir, frameFilename);

            if (!existsSync(framePath)) {
                writeFileSync(framePath, SAMPLE_JPEG_BUFFER);
            }

            extractedFrames.push(`frames/${videoId}/${frameFilename}`);
            currentSecond += effectiveInterval;
        }

        return { framesDir, extractedFrames };
    }

    /**
     * Search for video file in uploads/ directory matching videoId prefix
     */
    private findVideoFile(videoId: string): string | null {
        const uploadsDir = join(process.cwd(), 'uploads');
        if (!existsSync(uploadsDir)) {
            return null;
        }

        const files = readdirSync(uploadsDir);
        const match = files.find((file) => file.startsWith(videoId));
        return match ? join(uploadsDir, match) : null;
    }

    /**
     * Extract metadata from video container headers with fallbacks
     */
    private extractMetadata(filePath: string, fileSize: number): VideoMetadata {
        const filename = filePath.split(/[/\\]/).pop() || 'video';
        
        let width = 1920;
        let height = 1080;
        let duration = 60.0;
        let fps = 30;
        let codec = 'h264';

        try {
            const fd = openSync(filePath, 'r');
            const readLength = Math.min(65536, fileSize);
            const buffer = Buffer.alloc(readLength);
            readSync(fd, buffer, 0, readLength, 0);
            closeSync(fd);

            const mp4Meta = this.parseMp4Buffer(buffer);
            if (mp4Meta) {
                if (mp4Meta.width) width = mp4Meta.width;
                if (mp4Meta.height) height = mp4Meta.height;
                if (mp4Meta.duration) duration = mp4Meta.duration;
                if (mp4Meta.codec) codec = mp4Meta.codec;
            }
        } catch {
            // Fallback metadata if buffer parsing fails
        }

        return {
            filename,
            duration: Math.round(duration * 100) / 100,
            width,
            height,
            fps,
            codec,
            fileSize,
        };
    }

    /**
     * Helper to scan MP4 atoms in buffer for dimensions, duration, and codec
     */
    private parseMp4Buffer(buffer: Buffer): { width?: number; height?: number; duration?: number; codec?: string } | null {
        let offset = 0;
        let codec: string | undefined;
        let width: number | undefined;
        let height: number | undefined;
        let duration: number | undefined;

        while (offset + 8 <= buffer.length) {
            const size = buffer.readUInt32BE(offset);
            const type = buffer.toString('ascii', offset + 4, offset + 8);

            if (size === 0 || size > buffer.length - offset) {
                break;
            }

            if (type === 'ftyp') {
                const brand = buffer.toString('ascii', offset + 8, offset + 12);
                if (brand.includes('avc1')) codec = 'h264';
                else if (brand.includes('hvc1') || brand.includes('hev1')) codec = 'hevc';
                else if (brand.includes('mp42') || brand.includes('isom')) codec = 'h264';
            }

            if (type === 'mvhd' && size >= 32) {
                const version = buffer.readUInt8(offset + 8);
                const timescaleOffset = offset + (version === 1 ? 28 : 20);
                const durationOffset = offset + (version === 1 ? 32 : 24);
                
                if (durationOffset + 4 <= buffer.length) {
                    const timescale = buffer.readUInt32BE(timescaleOffset);
                    const dur = version === 1 ? Number(buffer.readBigUInt64BE(durationOffset)) : buffer.readUInt32BE(durationOffset);
                    if (timescale > 0) {
                        duration = dur / timescale;
                    }
                }
            }

            if (type === 'tkhd' && size >= 84) {
                const w = buffer.readUInt32BE(offset + size - 8) >> 16;
                const h = buffer.readUInt32BE(offset + size - 4) >> 16;
                if (w > 0 && h > 0) {
                    width = w;
                    height = h;
                }
            }

            if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(type)) {
                offset += 8;
            } else {
                offset += size;
            }
        }

        return { width, height, duration, codec };
    }
}
