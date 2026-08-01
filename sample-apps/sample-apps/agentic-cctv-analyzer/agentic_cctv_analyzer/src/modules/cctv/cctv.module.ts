import { Module } from '@nitrostack/core';
import { CctvService } from './cctv.service.js';
import { VideoAnalysisService } from './video-analysis.service.js';
import { EventStorageService } from './event-storage.service.js';
import { YoloDetectionService } from './yolo-detection.service.js';
import { DemoDetectionService } from './demo-detection.service.js';
import { TimelineService } from './timeline.service.js';
import { ClipGenerationService } from './clip-generation.service.js';
import { VideoSummaryService } from './video-summary.service.js';
import { DashboardService } from './dashboard.service.js';
import { CctvTools } from './cctv.tools.js';
import { CctvMediaTools } from './cctv.media.tools.js';

@Module({
    name: 'cctv',
    description: 'CCTV event search module',
    controllers: [CctvTools, CctvMediaTools],
    providers: [
        CctvService,
        VideoAnalysisService,
        EventStorageService,
        YoloDetectionService,
        DemoDetectionService,
        TimelineService,
        ClipGenerationService,
        VideoSummaryService,
        DashboardService,
    ],
})
export class CctvModule {}
