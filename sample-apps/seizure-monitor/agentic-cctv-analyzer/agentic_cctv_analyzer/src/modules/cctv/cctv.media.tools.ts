import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { CctvService } from './cctv.service.js';
import { VideoAnalysisService } from './video-analysis.service.js';

const UploadSchema = z.object({
    filename: z.string().describe('Filename of the CCTV video (e.g. entrance_cam.mp4)'),
    data: z.string().optional().describe('Base64 payload of the video file'),
    file_content: z.string().optional().describe('Alternative base64 payload field'),
});
const AnalyzeSchema = z.object({
    videoId: z.string().describe('Uploaded video id'),
    interval: z.number().optional().describe('Frame extraction interval in seconds (default: 10)'),
});
const ClipSchema = z.object({
    eventId: z.string().describe('Event ID to generate a demo clip for'),
});
const SummarizeSchema = z.object({ videoId: z.string().describe('Video id to summarize') });

@Injectable({ deps: [CctvService, VideoAnalysisService] })
export class CctvMediaTools {
    constructor(
        private readonly cctvService: CctvService,
        private readonly videoAnalysisService: VideoAnalysisService,
    ) { }

    @Tool({
        name: 'upload_cctv_video',
        description: 'Upload a CCTV video file (supported formats: mp4, avi, mov, mkv) to the analyzer',
        inputSchema: UploadSchema,
        examples: {
            request: { filename: 'entrance_cam.mp4', data: 'data:video/mp4;base64,...' },
            response: {
                videoId: 'vid_1771900000000_a1b2c',
                filename: 'entrance_cam.mp4',
                uploadTime: '2026-07-26T05:25:00.000Z',
                status: 'uploaded',
            },
        },
    })
    @Widget('uploaded-videos')
    async uploadCctvVideo(args: z.infer<typeof UploadSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Uploading CCTV video', { filename: args.filename });
        try {
            const payload = args.data || args.file_content;
            const result = await this.cctvService.saveUploadedVideo(args.filename, payload);
            ctx.logger.info('Successfully saved CCTV video upload', { videoId: result.videoId, filename: result.filename });
            return result;
        } catch (error: any) {
            ctx.logger.error('Failed to upload CCTV video', { error: error.message, filename: args.filename });
            throw new Error(`Video upload failed: ${error.message}`);
        }
    }

    @Tool({
        name: 'analyze_video',
        description: 'Analyze uploaded video metadata, extract frames, run YOLOv8 object detection, and store detected events',
        inputSchema: AnalyzeSchema,
        examples: {
            request: { videoId: 'vid_1771900000000_a1b2c', interval: 10 },
            response: {
                videoId: 'vid_1771900000000_a1b2c',
                framesProcessed: 13,
                objectsDetected: 15,
                eventsStored: 15,
                status: 'completed',
            },
        },
    })
    @Widget('detection-results')
    async analyzeVideo(args: z.infer<typeof AnalyzeSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Video analysis pipeline started', { videoId: args.videoId, interval: args.interval });
        try {
            const result = await this.videoAnalysisService.analyzeVideo(args.videoId, args.interval);
            ctx.logger.info('Video analysis pipeline completed', {
                videoId: args.videoId,
                framesProcessed: result.framesProcessed,
                objectsDetected: result.objectsDetected,
            });
            return result;
        } catch (error: any) {
            ctx.logger.error('Video analysis failed', { videoId: args.videoId, error: error.message });
            throw new Error(`Video analysis failed: ${error.message}`);
        }
    }

    @Tool({
        name: 'generate_video_clip',
        description: 'Generate a demo clip record from a selected detection event',
        inputSchema: ClipSchema,
        examples: {
            request: { eventId: 'evt_vid_123_f0_d1' },
            response: {
                clipId: 'clip_vid_123_abc123',
                videoId: 'vid_123',
                eventId: 'evt_vid_123_f0_d1',
                segmentStart: 5,
                segmentEnd: 15,
                clipTitle: 'Person Detection',
                clipDescription: 'Detected person walking near entrance.',
                generatedAt: '2026-07-26T12:34:56.000Z',
                clipUrl: '/clips/vid_123/clip_vid_123_abc123.mp4',
            },
        },
    })
    async generateVideoClip(args: z.infer<typeof ClipSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Generating video clip', { eventId: args.eventId });
        const clip = await this.cctvService.generateClip(args.eventId);
        return {
            clipId: clip.clipId,
            videoId: clip.videoId,
            eventId: clip.eventId,
            segmentStart: clip.segmentStart,
            segmentEnd: clip.segmentEnd,
            clipTitle: clip.clipTitle,
            clipDescription: clip.clipDescription,
            generatedAt: clip.generatedAt,
            clipUrl: clip.clipUrl,
        };
    }

    @Tool({
        name: 'summarize_video',
        description: 'Generate a natural-language summary of video detection events',
        inputSchema: SummarizeSchema,
        examples: {
            request: { videoId: 'vid_1771900000000_a1b2c' },
            response: {
                videoId: 'vid_1771900000000_a1b2c',
                generatedAt: '2026-07-26T12:34:56.000Z',
                totalEvents: 12,
                totalPeople: 6,
                totalVehicles: 4,
                totalAnimals: 1,
                totalObjects: 1,
                objectBreakdown: [
                    { objectClass: 'person', count: 6 },
                    { objectClass: 'car', count: 4 },
                    { objectClass: 'dog', count: 1 },
                ],
                activityTimeline: [
                    { start: 0, end: 30, description: '3 events between 00:00 and 00:30, primarily person activity.' },
                ],
                suspiciousEvents: 2,
                summary: 'This video contains 12 detected events. 6 people were detected. 4 vehicles were detected. 1 animal was detected. 1 object appeared in the scene. Key detections include 6 persons, 4 cars, 1 dog. Activity was highest between 00:00 and 00:30.',
            },
        },
    })
    async summarizeVideo(args: z.infer<typeof SummarizeSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Summarizing video', { videoId: args.videoId });
        return this.cctvService.generateSummary(args.videoId);
    }
}
