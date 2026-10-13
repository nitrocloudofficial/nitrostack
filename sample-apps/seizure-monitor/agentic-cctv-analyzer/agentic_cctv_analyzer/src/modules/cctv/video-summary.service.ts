import { Injectable } from '@nitrostack/core';
import { EventStorageService } from './event-storage.service.js';
import type { DetectionEvent } from './yolo-detection.service.js';

export interface VideoSummary {
    videoId: string;
    generatedAt: string;

    totalEvents: number;
    totalPeople: number;
    totalVehicles: number;
    totalAnimals: number;
    totalObjects: number;

    objectBreakdown: {
        objectClass: string;
        count: number;
    }[];

    activityTimeline: {
        start: number;
        end: number;
        description: string;
    }[];

    suspiciousEvents: number;

    summary: string;
}

const VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
const ANIMAL_CLASSES = ['dog'];
const OBJECT_CLASSES = ['backpack', 'suitcase'];
const PEOPLE_CLASS = ['person'];

@Injectable({ deps: [EventStorageService] })
export class VideoSummaryService {
    constructor(private readonly eventStorageService: EventStorageService) {}

    private formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    private buildSummaryMessage(summary: VideoSummary): string {
        const lines: string[] = [];
        lines.push(`This video contains ${summary.totalEvents} detected event${summary.totalEvents === 1 ? '' : 's'}.`);
        lines.push(`${summary.totalPeople} people ${summary.totalPeople === 1 ? 'was' : 'were'} detected.`);
        lines.push(`${summary.totalVehicles} vehicles ${summary.totalVehicles === 1 ? 'was' : 'were'} detected.`);
        if (summary.totalAnimals > 0) {
            lines.push(`${summary.totalAnimals} animal${summary.totalAnimals === 1 ? '' : 's'} ${summary.totalAnimals === 1 ? 'was' : 'were'} detected.`);
        }
        if (summary.totalObjects > 0) {
            lines.push(`${summary.totalObjects} object${summary.totalObjects === 1 ? '' : 's'} ${summary.totalObjects === 1 ? 'appeared' : 'appeared'} in the scene.`);
        }

        if (summary.objectBreakdown.length > 0) {
            const topBreakdown = summary.objectBreakdown.slice(0, 3).map((item) => `${item.count} ${item.objectClass}${item.count === 1 ? '' : 's'}`);
            lines.push(`Key detections include ${topBreakdown.join(', ')}.`);
        }

        if (summary.activityTimeline.length > 0) {
            const primary = summary.activityTimeline[0];
            lines.push(`Activity was highest between ${this.formatTime(primary.start)} and ${this.formatTime(primary.end)}.`);
        }

        if (summary.suspiciousEvents > 0) {
            lines.push(`${summary.suspiciousEvents} suspicious event${summary.suspiciousEvents === 1 ? '' : 's'} were identified.`);
        }

        return lines.join(' ');
    }

    private buildActivityTimeline(events: DetectionEvent[]): VideoSummary['activityTimeline'] {
        const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
        if (sorted.length === 0) {
            return [];
        }

        const intervalSeconds = 30;
        const blocks: { start: number; end: number; events: DetectionEvent[] }[] = [];
        let currentBlock = { start: sorted[0].timestamp, end: sorted[0].timestamp + intervalSeconds, events: [sorted[0]] };

        for (let i = 1; i < sorted.length; i++) {
            const event = sorted[i];
            if (event.timestamp <= currentBlock.end + 5) {
                currentBlock.end = Math.max(currentBlock.end, event.timestamp + intervalSeconds);
                currentBlock.events.push(event);
            } else {
                blocks.push(currentBlock);
                currentBlock = { start: event.timestamp, end: event.timestamp + intervalSeconds, events: [event] };
            }
        }
        blocks.push(currentBlock);

        return blocks.map((block) => {
            const topObject = block.events.reduce((acc, evt) => {
                const count = block.events.filter((item) => item.objectClass === evt.objectClass).length;
                return count > acc.count ? { objectClass: evt.objectClass, count } : acc;
            }, { objectClass: block.events[0]?.objectClass || 'activity', count: 0 });

            const description = `${block.events.length} event${block.events.length === 1 ? '' : 's'} between ${this.formatTime(block.start)} and ${this.formatTime(block.end)}, primarily ${topObject.objectClass} activity.`;
            return {
                start: block.start,
                end: block.end,
                description,
            };
        });
    }

    async generateSummary(videoId: string): Promise<VideoSummary> {
        if (!videoId) {
            throw new Error('videoId is required to generate a summary');
        }

        const record = await this.eventStorageService.getAnalysis(videoId);
        if (!record) {
            const summary: VideoSummary = {
                videoId,
                generatedAt: new Date().toISOString(),
                totalEvents: 0,
                totalPeople: 0,
                totalVehicles: 0,
                totalAnimals: 0,
                totalObjects: 0,
                objectBreakdown: [],
                activityTimeline: [],
                suspiciousEvents: 0,
                summary: `No analysis found for video ${videoId}.`,
            };
            return summary;
        }

        const existingSummary = await this.eventStorageService.getSummary(videoId);
        if (existingSummary) {
            return existingSummary;
        }

        const events = record.events ?? [];
        const counts = events.reduce(
            (acc, event) => {
                const objectClass = (event.objectClass || 'unknown').toLowerCase();
                acc.totalEvents += 1;
                if (PEOPLE_CLASS.includes(objectClass)) {
                    acc.totalPeople += 1;
                }
                if (VEHICLE_CLASSES.includes(objectClass)) {
                    acc.totalVehicles += 1;
                }
                if (ANIMAL_CLASSES.includes(objectClass)) {
                    acc.totalAnimals += 1;
                }
                if (OBJECT_CLASSES.includes(objectClass)) {
                    acc.totalObjects += 1;
                }

                const breakdownItem = acc.breakdown.get(objectClass) ?? 0;
                acc.breakdown.set(objectClass, breakdownItem + 1);

                if (event.severity === 'high' || event.action?.includes('unattended') || event.action?.includes('loitering') || event.tags?.includes('suspicious')) {
                    acc.suspiciousEvents += 1;
                }
                return acc;
            },
            {
                totalEvents: 0,
                totalPeople: 0,
                totalVehicles: 0,
                totalAnimals: 0,
                totalObjects: 0,
                breakdown: new Map<string, number>(),
                suspiciousEvents: 0,
            }
        );

        const objectBreakdown = Array.from(counts.breakdown.entries())
            .map(([objectClass, count]) => ({ objectClass, count }))
            .sort((a, b) => b.count - a.count);

        const activityTimeline = this.buildActivityTimeline(events);
        const summaryText = this.buildSummaryMessage({
            videoId,
            generatedAt: new Date().toISOString(),
            totalEvents: counts.totalEvents,
            totalPeople: counts.totalPeople,
            totalVehicles: counts.totalVehicles,
            totalAnimals: counts.totalAnimals,
            totalObjects: counts.totalObjects,
            objectBreakdown,
            activityTimeline,
            suspiciousEvents: counts.suspiciousEvents,
            summary: '',
        });

        const summary: VideoSummary = {
            videoId,
            generatedAt: new Date().toISOString(),
            totalEvents: counts.totalEvents,
            totalPeople: counts.totalPeople,
            totalVehicles: counts.totalVehicles,
            totalAnimals: counts.totalAnimals,
            totalObjects: counts.totalObjects,
            objectBreakdown,
            activityTimeline,
            suspiciousEvents: counts.suspiciousEvents,
            summary: summaryText,
        };

        await this.eventStorageService.saveSummary(videoId, summary);
        return summary;
    }
}
