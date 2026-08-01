import { Injectable } from '@nitrostack/core';
import { EventStorageService } from './event-storage.service.js';
import { DetectionEvent } from './yolo-detection.service.js';

export interface TimelineEntry {
    [key: string]: any;
    id: string;
    timestamp: number;
    objectClass: string;
    confidence: number;
    cameraId: string;
    action: string;
    description: string;
    severity?: string;
    frameNumber?: number;
    videoId?: string;
}

export interface TimelineSection {
    [key: string]: any;
    sectionId: string;
    startTime: number;
    endTime: number;
    timeLabel: string;
    eventCount: number;
    events: TimelineEntry[];
}

export interface TimelineResult {
    [key: string]: any;
    success: boolean;
    videoId?: string;
    groupIntervalSeconds: number;
    totalEvents: number;
    totalSections: number;
    sections: TimelineSection[];
    events: TimelineEntry[];
}

@Injectable({ deps: [EventStorageService] })
export class TimelineService {
    constructor(private readonly eventStorageService: EventStorageService) {}

    /**
     * Generate chronological timeline grouped into logical time sections from EventStorageService
     */
    async getEventTimeline(videoId?: string, groupIntervalSeconds: number = 30): Promise<TimelineResult> {
        let detections: DetectionEvent[] = [];

        if (videoId) {
            detections = await this.eventStorageService.getEventsForVideo(videoId);
        } else {
            detections = await this.eventStorageService.searchStoredEvents();
        }

        // Sort all events chronologically by timestamp ascending
        detections.sort((a, b) => a.timestamp - b.timestamp);

        const timelineEntries: TimelineEntry[] = detections.map((det) => ({
            id: det.id,
            timestamp: det.timestamp,
            objectClass: det.objectClass || 'object',
            confidence: det.confidence || 0.9,
            cameraId: det.cameraId || 'cam_01',
            action: det.action || 'detected',
            description: det.description || `${det.objectClass} detected`,
            severity: det.severity || 'medium',
            frameNumber: det.frameNumber,
            videoId: det.videoId,
        }));

        // Group events into logical timeline sections
        const sectionsMap = new Map<number, TimelineEntry[]>();
        const interval = Math.max(10, groupIntervalSeconds);

        for (const entry of timelineEntries) {
            const sectionKey = Math.floor(entry.timestamp / interval);
            if (!sectionsMap.has(sectionKey)) {
                sectionsMap.set(sectionKey, []);
            }
            sectionsMap.get(sectionKey)!.push(entry);
        }

        const sections: TimelineSection[] = Array.from(sectionsMap.entries()).map(([sectionKey, sectionEvents]) => {
            const startTime = sectionKey * interval;
            const endTime = startTime + interval;
            const timeLabel = `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;

            return {
                sectionId: `section_${sectionKey}`,
                startTime,
                endTime,
                timeLabel,
                eventCount: sectionEvents.length,
                events: sectionEvents,
            };
        });

        return {
            success: true,
            videoId,
            groupIntervalSeconds: interval,
            totalEvents: timelineEntries.length,
            totalSections: sections.length,
            sections,
            events: timelineEntries,
        };
    }

    private formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const padMins = String(mins).padStart(2, '0');
        const padSecs = String(secs).padStart(2, '0');
        return `${padMins}:${padSecs}`;
    }
}
