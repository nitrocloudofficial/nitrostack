    import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
    import { dirname, join, extname, basename } from 'path';
    import { fileURLToPath } from 'url';
    import { Injectable } from '@nitrostack/core';
    import { EventStorageService } from './event-storage.service.js';
    import { TimelineService } from './timeline.service.js';
    import { ClipGenerationService } from './clip-generation.service.js';
    import { VideoSummaryService } from './video-summary.service.js';
    import { DashboardService } from './dashboard.service.js';
    import { DetectionEvent } from './yolo-detection.service.js';

    export interface UploadedVideoResult {
        videoId: string;
        filename: string;
        uploadTime: string;
        status: string;
    }

    const ALLOWED_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv'];

    const dataPath = join(dirname(fileURLToPath(import.meta.url)), '../../../data/mock_cctv.json');
    const mockEventsRaw = JSON.parse(readFileSync(dataPath, 'utf8')) as any[];

    // Map mock events to structured DetectionEvent objects
    const mockEvents: DetectionEvent[] = mockEventsRaw.map((evt) => ({
        id: evt.id,
        videoId: 'mock_video_01',
        frameNumber: Math.floor(evt.timestamp * 2.5),
        timestamp: evt.timestamp,
        objectClass: evt.label.toLowerCase().includes('vehicle') ? 'car' : 'person',
        confidence: evt.confidence,
        boundingBox: { x: 300, y: 200, width: 250, height: 250 },
        severity: evt.severity || 'medium',
        label: evt.label,
        trackId: `track_mock_${evt.id}`,
        action: evt.label.toLowerCase().includes('vehicle') ? 'moving' : 'walking',
        cameraId: 'cam_01',
        location: 'Restricted Zone',
        description: evt.label,
        tags: [evt.label.toLowerCase().includes('vehicle') ? 'car' : 'person', evt.severity || 'medium'],
    }));

    @Injectable({ deps: [EventStorageService, TimelineService, ClipGenerationService, VideoSummaryService, DashboardService] })
    export class CctvService {
        constructor(
            private readonly eventStorageService: EventStorageService,
            private readonly timelineService: TimelineService,
            private readonly clipGenerationService: ClipGenerationService,
            private readonly videoSummaryService: VideoSummaryService,
            private readonly dashboardService: DashboardService,
        ) {}

        /**
         * Real Event Search across stored DetectionEvents in EventStorageService
         */
        async searchEvents(keyword?: string) {
            let storedDetections: DetectionEvent[] = [];

            if (this.eventStorageService) {
                storedDetections = await this.eventStorageService.searchStoredEvents(keyword);
            }

            let combinedEvents: DetectionEvent[] = [];

            if (storedDetections.length > 0) {
                combinedEvents = storedDetections;
            } else {
                // Fallback to mock events formatted as DetectionEvent objects if no stored analyses exist
                if (!keyword) {
                    combinedEvents = mockEvents;
                } else {
                    const lower = keyword.toLowerCase();
                    combinedEvents = mockEvents.filter((evt) => this.matchesKeyword(evt, lower));
                }
            }

            // Sort search results chronologically by timestamp ascending
            combinedEvents.sort((a, b) => a.timestamp - b.timestamp);

            return {
                success: true,
                count: combinedEvents.length,
                data: combinedEvents,
            };
        }

        async getTimeline(videoId: string) {
            if (!videoId) {
                throw new Error('videoId is required to generate a timeline');
            }

            const timeline = await this.timelineService.getEventTimeline(videoId, 10);
            return {
                success: timeline.success,
                videoId,
                groupIntervalSeconds: timeline.groupIntervalSeconds,
                totalEvents: timeline.totalEvents,
                totalSections: timeline.totalSections,
                sections: timeline.sections,
                events: timeline.events,
            };
        }

        async generateClip(eventId: string) {
            return this.clipGenerationService.generateClip(eventId);
        }

        async listVideoClips(videoId: string) {
            return this.clipGenerationService.listVideoClips(videoId);
        }

        async generateSummary(videoId: string) {
            return this.videoSummaryService.generateSummary(videoId);
        }

        async getDashboard() {
            return this.dashboardService.getDashboardStats();
        }

        private matchesKeyword(evt: DetectionEvent, lower: string): boolean {
            const matchesClass = evt.objectClass?.toLowerCase().includes(lower);
            const matchesDesc = evt.description?.toLowerCase().includes(lower);
            const matchesLabel = evt.label?.toLowerCase().includes(lower);
            const matchesAction = evt.action?.toLowerCase().includes(lower);
            const matchesCamera = evt.cameraId?.toLowerCase().includes(lower);
            const matchesConfidence = evt.confidence !== undefined && String(evt.confidence).includes(lower);
            const matchesTimestamp = evt.timestamp !== undefined && String(evt.timestamp).includes(lower);
            const matchesTags = evt.tags?.some((t) => t.toLowerCase().includes(lower));

            return Boolean(
                matchesClass ||
                matchesDesc ||
                matchesLabel ||
                matchesAction ||
                matchesCamera ||
                matchesConfidence ||
                matchesTimestamp ||
                matchesTags
            );
        }

        async saveUploadedVideo(filename: string, base64Content?: string): Promise<UploadedVideoResult> {
            if (!filename) {
                throw new Error('Filename is required.');
            }

            const safeFilename = basename(filename);
            const ext = extname(safeFilename).toLowerCase();

            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                throw new Error(`Unsupported video format "${ext}". Supported formats are: mp4, avi, mov, mkv.`);
            }

            const videoId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const uploadsDir = join(process.cwd(), 'uploads');

            if (!existsSync(uploadsDir)) {
                mkdirSync(uploadsDir, { recursive: true });
            }

            const targetPath = join(uploadsDir, `${videoId}_${safeFilename}`);

            if (base64Content) {
                const matches = base64Content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                const rawBase64 = matches && matches.length === 3 ? matches[2] : base64Content;
                const buffer = Buffer.from(rawBase64, 'base64');
                writeFileSync(targetPath, buffer);
            }

            return {
                videoId,
                filename: safeFilename,
                uploadTime: new Date().toISOString(),
                status: 'uploaded',
            };
        }
    }
