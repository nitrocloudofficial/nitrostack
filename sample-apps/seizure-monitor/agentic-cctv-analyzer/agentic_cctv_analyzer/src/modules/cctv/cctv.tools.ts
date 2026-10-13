import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { CctvService } from './cctv.service.js';

const SearchSchema = z.object({
    keyword: z.string().optional().describe('Keyword to search across object class, action, description, camera ID, confidence, or tags'),
});

const TimelineSchema = z.object({
    videoId: z.string().describe('Video ID to generate the CCTV event timeline for'),
});

const DashboardSchema = z.object({});

@Injectable({ deps: [CctvService] })
export class CctvTools {
    constructor(private readonly cctvService: CctvService) { }

    @Tool({
        name: 'search_cctv_events',
        description: 'Search detected CCTV events by keyword (object class, action, camera ID, description, or tags) sorted chronologically',
        inputSchema: SearchSchema,
        examples: {
            request: { keyword: 'person' },
            response: {
                success: true,
                count: 1,
                data: [
                    {
                        id: 'evt_vid_123_f0_d1',
                        videoId: 'vid_123',
                        frameNumber: 0,
                        timestamp: 0,
                        objectClass: 'person',
                        confidence: 0.94,
                        boundingBox: { x: 320, y: 180, width: 120, height: 280 },
                        trackId: 'track_person_1',
                        action: 'walking',
                        cameraId: 'cam_main_entrance',
                        description: 'person (walking) detected at 0s with 94% confidence',
                        tags: ['person', 'walking', 'cctv_demo'],
                    },
                ],
            },
        },
    })
    @Widget('cctv-events')
    async searchCctvEvents(args: z.infer<typeof SearchSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Searching CCTV events', { keyword: args.keyword });
        return this.cctvService.searchEvents(args.keyword);
    }

    @Tool({
        name: 'get_event_timeline',
        description: 'Generate a CCTV event timeline from stored detection events for the specified videoId',
        inputSchema: TimelineSchema,
        examples: {
            request: { videoId: 'vid_1771900000000_a1b2c' },
            response: {
                success: true,
                videoId: 'vid_1771900000000_a1b2c',
                groupIntervalSeconds: 10,
                totalEvents: 12,
                totalSections: 3,
                sections: [
                    {
                        sectionId: 'section_0',
                        startTime: 0,
                        endTime: 10,
                        timeLabel: '00:00 - 00:10',
                        eventCount: 4,
                        events: [/* timeline entries */],
                    },
                ],
                events: [/* flattened timeline entries */],
            },
        },
    })
    @Widget('event-timeline')
    async getEventTimeline(args: z.infer<typeof TimelineSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Generating CCTV event timeline', { videoId: args.videoId });
        return this.cctvService.getTimeline(args.videoId);
    }

    @Tool({
        name: 'get_dashboard',
        description: 'Get analytics dashboard statistics from stored CCTV analysis data',
        inputSchema: DashboardSchema,
        examples: {
            request: {},
            response: {
                totalVideos: 3,
                totalAnalyses: 3,
                totalEvents: 42,
                totalPeople: 18,
                totalVehicles: 12,
                totalAnimals: 2,
                totalObjects: 4,
                totalClips: 5,
                totalSummaries: 3,
                recentVideos: [
                    {
                        videoId: 'vid_1771900000000_a1b2c',
                        filename: 'entrance_cam.mp4',
                        analyzedAt: '2026-07-26T12:00:00.000Z',
                        eventCount: 15,
                    },
                ],
                recentEvents: [
                    {
                        id: 'evt_vid_123_f0_d1',
                        videoId: 'vid_123',
                        timestamp: 30,
                        objectClass: 'person',
                        label: 'Person detected',
                        confidence: 0.94,
                    },
                ],
                recentClips: [
                    {
                        clipId: 'clip_evt_vid_123_f0_d1',
                        videoId: 'vid_123',
                        eventId: 'evt_vid_123_f0_d1',
                        clipTitle: 'Person Detection',
                        generatedAt: '2026-07-26T12:34:56.000Z',
                    },
                ],
                objectDistribution: [
                    { objectClass: 'person', count: 18 },
                    { objectClass: 'car', count: 12 },
                ],
            },
        },
    })
    @Widget('analytics-dashboard')
    async getDashboard(_args: z.infer<typeof DashboardSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Fetching analytics dashboard stats');
        return this.cctvService.getDashboard();
    }
}
